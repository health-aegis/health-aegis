from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from azure.monitor.opentelemetry import configure_azure_monitor
import os, re, io, base64, mimetypes, urllib.request, urllib.parse

if os.getenv("APPLICATIONINSIGHTS_CONNECTION_STRING"):
    try:
        configure_azure_monitor()
    except Exception as e:
        print(f"Warning: Failed to configure Azure Monitor: {e}")

app = FastAPI(title="Diagnostic Agent Service — Aegis Health")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash"]

ai_ready = False
if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        ai_ready = True
        print("✅ [diagnostic-agent] Gemini AI configured for vision analysis")
    except Exception as e:
        print(f"⚠️  [diagnostic-agent] Gemini setup failed: {e}")
else:
    print("ℹ️  [diagnostic-agent] GEMINI_API_KEY not set — simulation mode active")


class DiagnosticRequest(BaseModel):
    image_url: str
    patient_context: str


def _clean_filename(image_url: str) -> str:
    filename = image_url.split("/")[-1] if "/" in image_url else image_url
    if re.match(r"^[0-9a-f\-]{36}-", filename):
        filename = filename[37:]
    return filename


def _fetch_image_bytes(image_url: str) -> bytes:
    """Download image from Azure Blob Storage or a plain HTTP URL."""
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
    if conn_str and "blob.core.windows.net" in image_url:
        try:
            from azure.storage.blob import BlobClient
            parsed = urllib.parse.urlparse(image_url)
            parts = parsed.path.lstrip("/").split("/", 1)
            if len(parts) == 2:
                container, blob_name = parts
                bc = BlobClient.from_connection_string(
                    conn_str, container, urllib.parse.unquote(blob_name)
                )
                return bc.download_blob().readall()
        except Exception as e:
            print(f"⚠️  [diagnostic-agent] Blob fetch failed, trying HTTP: {e}")

    req_obj = urllib.request.Request(image_url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req_obj, timeout=15) as resp:
        return resp.read()


def _analyze_with_gemini(image_bytes: bytes, filename: str, context: str) -> tuple[str, str]:
    """Returns (report_text, model_used). Tries each Gemini model in order."""
    import google.generativeai as genai
    import PIL.Image

    mime_type = mimetypes.guess_type(filename)[0] or "image/jpeg"
    pil_img = PIL.Image.open(io.BytesIO(image_bytes))

    prompt = (
        "You are an expert medical imaging AI assistant analyzing a patient's uploaded file.\n\n"
        f"Patient context:\n{context}\n\n"
        f"Filename: {filename}\n\n"
        "Provide a structured diagnostic report with the following sections:\n"
        "1. IMAGE TYPE & QUALITY — Identify what kind of document/scan this is and assess quality\n"
        "2. FINDINGS — List specific observations from the image in detail\n"
        "3. IMPRESSION — Overall clinical assessment\n"
        "4. RECOMMENDATIONS — Suggested follow-up actions\n\n"
        "Be specific and clinically relevant based on what you actually observe. "
        "If this is a lab report or text document, extract and summarize the key values."
    )

    last_error = None
    for model_name in GEMINI_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content([prompt, pil_img])
            text = response.text
            if text and text.strip():
                print(f"✅ [diagnostic-agent] Analysis complete via {model_name}")
                return text, model_name
        except Exception as e:
            last_error = e
            print(f"⚠️  [diagnostic-agent] {model_name} failed: {e}")

    raise RuntimeError(f"All Gemini models failed: {last_error}")


def _detect_image_type(filename: str, clinical_notes: str) -> str:
    name = filename.lower()
    notes = clinical_notes.lower()
    if any(k in name or k in notes for k in ["xray", "x-ray", "chest", "cxr"]):
        return "chest_xray"
    if any(k in name or k in notes for k in ["mri", "brain", "spine", "neuro"]):
        return "mri"
    if any(k in name or k in notes for k in ["ct", "scan", "abdomen"]):
        return "ct_scan"
    if any(k in name or k in notes for k in ["echo", "ultrasound", "cardiac"]):
        return "ultrasound"
    if any(k in name or k in notes for k in ["lab", "blood", "cbc", "glucose", "lipid"]):
        return "lab_report"
    return "general"


def _generate_simulation_report(filename: str, context: str) -> str:
    """Contextual fallback report when Gemini is unavailable."""
    fields = {}
    for line in context.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fields[k.strip()] = v.strip()

    patient_name = fields.get("Patient Name", "Unknown")
    upload_date = fields.get("Upload Date", "Unknown")
    notes = fields.get("Clinical Notes", "No additional context.")
    image_type = _detect_image_type(filename, notes)

    type_data = {
        "chest_xray": (
            "Chest X-Ray (CXR)",
            "• Lung fields clear bilaterally\n• Cardiac silhouette within normal limits\n• No pleural effusion or pneumothorax",
            "No acute cardiopulmonary abnormality.",
        ),
        "mri": (
            "MRI",
            "• Normal grey/white matter differentiation\n• Ventricles normal in size\n• No midline shift",
            "No significant intracranial pathology identified.",
        ),
        "ct_scan": (
            "CT Scan",
            "• No hyperdense or hypodense lesions\n• Vascular structures within normal calibre\n• No free air or fluid",
            "No acute CT findings.",
        ),
        "ultrasound": (
            "Ultrasound",
            "• Cardiac chambers normal size\n• Ejection fraction estimated normal (≥55%)\n• No pericardial effusion",
            "Echocardiographic findings within normal limits.",
        ),
        "lab_report": (
            "Laboratory Report",
            "• Values reviewed against standard reference ranges\n• No critical values flagged\n• Results consistent with baseline",
            "Lab values within acceptable limits. Correlate clinically.",
        ),
    }.get(
        image_type,
        (
            "Medical Document",
            "• Image quality adequate for review\n• No acute abnormalities on preliminary scan\n• Soft tissues unremarkable",
            "No significant findings on preliminary review.",
        ),
    )

    scan_type, findings, impression = type_data
    return (
        f"📋 DIAGNOSTIC REPORT (Simulation Mode)\n"
        f"{'=' * 42}\n\n"
        f"Patient: {patient_name}  |  File: {filename}  |  Date: {upload_date}\n"
        f"Type: {scan_type}\n\n"
        f"FINDINGS:\n{findings}\n\n"
        f"IMPRESSION:\n{impression}\n\n"
        f"RECOMMENDATIONS:\n"
        f"• Correlate with clinical presentation\n"
        f"• Consult relevant specialist for formal review\n\n"
        f"⚠️  SIMULATION MODE — Set GEMINI_API_KEY for live AI analysis."
    )


@app.post("/analyze")
def analyze_image(req: DiagnosticRequest):
    filename = _clean_filename(req.image_url)
    print(f"🔬 [diagnostic-agent] Analyzing: {filename}")

    if not ai_ready:
        report = _generate_simulation_report(filename, req.patient_context)
        return {"status": "success", "mode": "simulation", "report": report}

    try:
        image_bytes = _fetch_image_bytes(req.image_url)
        report, model_used = _analyze_with_gemini(image_bytes, filename, req.patient_context)
        return {"status": "success", "mode": "live", "model": model_used, "report": report}
    except Exception as e:
        print(f"⚠️  [diagnostic-agent] Live analysis failed: {e} — falling back to simulation")
        report = _generate_simulation_report(filename, req.patient_context)
        return {"status": "success", "mode": "simulation", "report": report}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "diagnostic-agent-service",
        "mode": "live (Gemini)" if ai_ready else "simulation",
    }
