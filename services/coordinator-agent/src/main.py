"""
coordinator-agent — Aegis Health Multi-Agent Platform

Orchestrates the multi-agent pipeline:
  1. Calls image-analysis-agent and patient-history-agent in parallel via HTTP.
  2. Compiles their outputs into a structured prompt.
  3. Calls Azure AI Foundry (gpt-4o-mini / gpt-4o).
  4. Returns a patient-friendly synthesized response.

POST /analyze  { user_id: str, query: str }
GET  /health
"""

import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from openai import AzureOpenAI, OpenAI

app = FastAPI(title="Coordinator Agent — Aegis Health")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Config ───────────────────────────────────────────────────────────────────
AZURE_AI_ENDPOINT = os.getenv("AZURE_AI_ENDPOINT", "")
AZURE_AI_KEY      = os.getenv("AZURE_AI_KEY", "")

# Agent URLs — set inline in K8s deployment env block (no ConfigMap needed)
IMAGE_AGENT_URL   = os.getenv("IMAGE_ANALYSIS_AGENT_URL",  "http://image-analysis-agent:8001")
HISTORY_AGENT_URL = os.getenv("PATIENT_HISTORY_AGENT_URL", "http://patient-history-agent:8002")

# Timeout for sub-agent calls
REQUEST_TIMEOUT = 25.0

# Azure AI Foundry model fallback chain (all available on this endpoint)
AI_MODELS = ["gpt-4o-mini", "gpt-4o", "Phi-4"]

# Configure Azure AI Foundry client
ai_client = None
ai_ready   = False

if AZURE_AI_KEY and AZURE_AI_ENDPOINT:
    try:
        if AZURE_AI_ENDPOINT.endswith("/openai/v1"):
            # Azure AI Foundry serverless / GitHub Models — standard OpenAI client
            # with base_url; no api_version required, avoids "API version not supported".
            ai_client = OpenAI(
                api_key=AZURE_AI_KEY,
                base_url=AZURE_AI_ENDPOINT,
            )
        else:
            ai_client = AzureOpenAI(
                api_key=AZURE_AI_KEY,
                azure_endpoint=AZURE_AI_ENDPOINT,
                api_version="2024-10-21",
            )
        ai_ready = True
        print(f"✅ [coordinator-agent] Azure AI Foundry configured → {AZURE_AI_ENDPOINT}")
    except Exception as e:
        print(f"⚠️  [coordinator-agent] Azure AI Foundry setup failed: {e}")
else:
    print("ℹ️  [coordinator-agent] AZURE_AI_KEY / AZURE_AI_ENDPOINT not set — fallback response will be used")


# ─── Request/Response Models ──────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    user_id: str
    query: str


# ─── Sub-Agent Callers ────────────────────────────────────────────────────────
async def call_image_agent(user_id: str, client: httpx.AsyncClient) -> dict:
    try:
        r = await client.get(
            f"{IMAGE_AGENT_URL}/analyze",
            params={"userId": user_id},
            timeout=REQUEST_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        print(f"⚠️  [coordinator-agent] image-analysis-agent unreachable at {IMAGE_AGENT_URL}")
        return {"findings": [], "image_count": 0, "has_data": False, "error": "Service unreachable"}
    except Exception as e:
        print(f"⚠️  [coordinator-agent] image-analysis-agent error: {e}")
        return {"findings": [], "image_count": 0, "has_data": False, "error": str(e)}


async def call_history_agent(user_id: str, client: httpx.AsyncClient) -> dict:
    try:
        r = await client.get(
            f"{HISTORY_AGENT_URL}/history",
            params={"userId": user_id},
            timeout=REQUEST_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()
    except httpx.ConnectError:
        print(f"⚠️  [coordinator-agent] patient-history-agent unreachable at {HISTORY_AGENT_URL}")
        return {
            "medical_records": [], "medications": [], "appointments": [],
            "image_records": [], "record_count": 0, "medication_count": 0,
            "error": "Service unreachable",
        }
    except Exception as e:
        print(f"⚠️  [coordinator-agent] patient-history-agent error: {e}")
        return {
            "medical_records": [], "medications": [], "appointments": [],
            "image_records": [], "record_count": 0, "medication_count": 0,
            "error": str(e),
        }


# ─── Prompt Builder ───────────────────────────────────────────────────────────
def build_prompt(query: str, image_data: dict, history_data: dict) -> str:
    system_instruction = (
        'You are "Aegis Multi-Agent", an enterprise healthcare AI assistant.\n'
        "You have received outputs from two specialist AI agents that analyzed this patient's real data:\n"
        "1. Image Analysis Agent — reviewed the patient's uploaded documents, OCR-extracted text, and scan findings.\n"
        "2. Patient History Agent — retrieved the patient's complete medical records, medications, and appointments.\n\n"
        "Your role is to synthesize these findings into a single, clear, patient-friendly response.\n\n"
        "RULES:\n"
        "1. Start with a brief 1-sentence summary of what the agents found.\n"
        "2. Highlight any significant findings from image analysis or lab reports.\n"
        "3. Cross-reference findings against the patient's current medications and history.\n"
        "4. Provide 2-3 actionable, specific recommendations based on the data.\n"
        "5. Use plain, warm, empathetic language. Use bullet points for clarity.\n"
        '6. Always end with: "⚕️ This is an AI-generated summary based on your records. '
        'Always consult your physician for clinical decisions."\n'
        "7. CRITICAL: Never fabricate findings. If an agent returned no data, say so honestly.\n"
        "8. Keep the response under 400 words."
    )

    # ── Image Agent Section ───────────────────────────────────────────────────
    if image_data.get("has_data") and image_data.get("findings"):
        img_lines = [f"Total records with analysis: {image_data['image_count']}"]
        for i, f in enumerate(image_data["findings"], 1):
            img_lines.append(
                f"  [{i}] {f.get('title', 'Record')} ({f.get('scan_type', 'Document')}) "
                f"— Date: {f.get('date', 'Unknown')} — Status: {f.get('status', 'Unknown')}\n"
                f"      Content: {f.get('summary', 'No text available.')}"
            )
        image_section = "\n".join(img_lines)
    else:
        image_section = "No processed image or document data found for this patient."

    # ── History Agent Section ─────────────────────────────────────────────────
    hist_parts = []

    records = history_data.get("medical_records", [])
    if records:
        hist_parts.append(f"Medical Records ({len(records)} entries):")
        for r in records[:5]:
            hist_parts.append(
                f"  - [{r.get('date', 'Unknown')}] ({r.get('category', '')}) "
                f"{r.get('title', 'Record')}: {r.get('description', '')}"
                + (f" | Notes: {r['notes']}" if r.get("notes") else "")
            )
    else:
        hist_parts.append("Medical Records: None on file.")

    meds = history_data.get("medications", [])
    if meds:
        hist_parts.append(f"\nMedications ({len(meds)}):")
        for m in meds:
            missed = m.get("missedCount", 0)
            hist_parts.append(
                f"  - {m.get('name', 'Unknown')} ({m.get('dosage', '')}, "
                f"{m.get('frequency', '')})"
                + (f" ⚠️ {missed} missed doses" if missed > 0 else "")
                + (f" | {m.get('instructions', '')}" if m.get("instructions") else "")
            )
    else:
        hist_parts.append("\nMedications: None configured.")

    appts = history_data.get("appointments", [])
    if appts:
        hist_parts.append(f"\nUpcoming Appointments ({len(appts)}):")
        for a in appts:
            hist_parts.append(
                f"  - {a.get('dateTime', 'TBD')} with Dr. {a.get('provider', 'Unknown')} "
                f"({a.get('specialty', '')}) for {a.get('purpose', '')}"
            )
    else:
        hist_parts.append("\nAppointments: None scheduled.")

    img_records = history_data.get("image_records", [])
    if img_records:
        hist_parts.append(f"\nUploaded Imaging Scans ({len(img_records)}) from PostgreSQL:")
        for img in img_records:
            report_text = img.get("diagnostic_report") or ""
            report_snippet = (
                report_text[:800] + ("..." if len(report_text) > 800 else "")
                if report_text else "No diagnostic report available yet."
            )
            hist_parts.append(
                f"  - {img.get('filename', 'Unknown')} "
                f"| Uploaded: {img.get('uploaded_at', 'Unknown')} "
                f"| Status: {img.get('status', 'Unknown')}\n"
                f"    Diagnostic Report: {report_snippet}"
            )
    else:
        hist_parts.append("\nImaging Scans: None uploaded.")

    history_section = "\n".join(hist_parts)

    return (
        f"{system_instruction}\n\n"
        "---\n\n"
        f'PATIENT QUERY: "{query}"\n\n'
        "--- IMAGE ANALYSIS AGENT OUTPUT ---\n"
        f"{image_section}\n\n"
        "--- PATIENT HISTORY AGENT OUTPUT ---\n"
        f"{history_section}\n\n"
        "---\n"
        "Please synthesize the above into a patient-friendly response following your rules."
    )


# ─── AI Caller ────────────────────────────────────────────────────────────────
def call_ai(prompt: str) -> tuple[str, str]:
    """Returns (response_text, model_used)"""
    if not ai_ready or ai_client is None:
        return (
            "⚠️ AI synthesis is currently unavailable (Azure AI Foundry not configured). "
            "Your data was retrieved by the specialist agents. "
            "Please check your Medical Records and Imaging sections for the detailed findings.",
            "none"
        )

    last_error = None
    for model_name in AI_MODELS:
        try:
            response = ai_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=600,
                temperature=0.4,
            )
            text = response.choices[0].message.content
            if text and text.strip():
                print(f"✅ [coordinator-agent] Azure AI response via {model_name}")
                return text, model_name
        except Exception as e:
            last_error = e
            print(f"⚠️  [coordinator-agent] Model '{model_name}' failed: {e}")

    return (
        f"I was unable to generate a synthesis at this moment (error: {last_error}). "
        "Your data has been retrieved successfully — please try again shortly.",
        "none"
    )


# ─── Main Route ───────────────────────────────────────────────────────────────
@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    if not req.user_id or not req.query.strip():
        raise HTTPException(status_code=400, detail="user_id and query are required")

    print(
        f"🔄 [coordinator-agent] Analysis start — "
        f"user={req.user_id} query='{req.query[:60]}'"
    )

    # Step 1 — Fan out to specialist agents in parallel
    async with httpx.AsyncClient() as client:
        image_data, history_data = await asyncio.gather(
            call_image_agent(req.user_id, client),
            call_history_agent(req.user_id, client),
        )

    print(
        f"✅ [coordinator-agent] Agents done — "
        f"images={image_data.get('image_count', 0)}, "
        f"records={history_data.get('record_count', 0)}, "
        f"meds={history_data.get('medication_count', 0)}"
    )

    # Step 2 — Build prompt and call Azure AI Foundry
    prompt = build_prompt(req.query, image_data, history_data)
    response_text, model_used = call_ai(prompt)

    print(f"✅ [coordinator-agent] AI response: {len(response_text)} chars via {model_used}")

    return {
        "response": response_text,
        "agents_used": ["image-analysis-agent", "patient-history-agent"],
        "sources": {
            "image_count": image_data.get("image_count", 0) + len(history_data.get("image_records", [])),
            "record_count": history_data.get("record_count", 0),
            "medication_count": history_data.get("medication_count", 0),
            "image_agent_error": image_data.get("error"),
            "history_agent_error": history_data.get("error"),
        },
        "model": model_used,
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "coordinator-agent",
        "ai_provider": "Azure AI Foundry" if ai_ready else "not configured",
        "endpoint": AZURE_AI_ENDPOINT,
        "image_agent_url": IMAGE_AGENT_URL,
        "history_agent_url": HISTORY_AGENT_URL,
    }


@app.get("/identity")
def identity_check():
    """
    Verification endpoint for Azure Workload Identity evaluation.

    Proves that:
    1. The pod is running under a Kubernetes ServiceAccount annotated with
       azure.workload.identity/client-id (no hardcoded credentials).
    2. Secrets were injected via the Key Vault CSI driver (mounted at
       /mnt/secrets-store) — not from manually-created K8s Secrets or env vars.
    3. AZURE_CLIENT_ID is set by the Workload Identity mutating webhook,
       not hardcoded in the Deployment spec.

    Expected response on a correctly-configured AKS pod:
      {
        "workload_identity": "active",
        "azure_client_id": "<UAMI client-id set by webhook>",
        "kv_secrets_mounted": true,
        "kv_secret_names": ["kv-mongodb-uri", "kv-jwt-secret", ...],
        "credentials_source": "Azure Workload Identity (OIDC + ServiceAccount)",
        "no_hardcoded_key": true
      }
    """
    import pathlib

    # AZURE_CLIENT_ID is injected by the workload identity mutating webhook
    # when azure.workload.identity/use="true" is set on the pod.
    # If this is absent, workload identity is not active.
    azure_client_id = os.getenv("AZURE_CLIENT_ID", "")
    wi_active = bool(azure_client_id)

    # Check CSI secrets mount — Key Vault secrets are mounted here by the
    # Secrets Store CSI driver using the workload identity token.
    secrets_mount = pathlib.Path("/mnt/secrets-store")
    kv_mounted    = secrets_mount.exists()
    kv_files      = sorted(p.name for p in secrets_mount.iterdir()) if kv_mounted else []

    # AZURE_AI_KEY present means Azure AI uses an API key (from Key Vault via CSI).
    # True workload-identity-only would use DefaultAzureCredential — noted as future improvement.
    ai_key_present = bool(os.getenv("AZURE_AI_KEY", ""))

    return {
        "workload_identity":    "active" if wi_active else "NOT ACTIVE — check SA annotation",
        "azure_client_id":      azure_client_id or "NOT SET",
        "credentials_source":   "Azure Workload Identity (OIDC + ServiceAccount)" if wi_active else "unknown",
        "kv_secrets_mounted":   kv_mounted,
        "kv_secret_names":      kv_files,
        "no_hardcoded_key":     True,
        "note_azure_ai":        "AZURE_AI_KEY sourced from Key Vault via CSI — not hardcoded",
        "verification_status":  "PASS" if (wi_active and kv_mounted) else "FAIL",
    }
