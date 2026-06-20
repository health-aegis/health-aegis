"""
image-analysis-agent — Aegis Health Multi-Agent Platform

Reads GPT-4o image analysis results already stored in Cosmos DB by the
existing diagnostic-agent-service and Azure Function OCR pipeline.
Uses MONGODB_URI (same Key Vault secret as api-gateway).

Exposes: GET /analyze?userId={id}
         GET /health
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

app = FastAPI(title="Image Analysis Agent — Aegis Health")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cosmos DB (MongoDB API) ──────────────────────────────────────────────────
# Key Vault CSI injects MONGODB_URI (same secret used by api-gateway and azure-function)
MONGODB_URI = os.getenv("MONGODB_URI", "")
cosmos_client = None
cosmos_db = None


@app.on_event("startup")
async def startup():
    global cosmos_client, cosmos_db
    if MONGODB_URI:
        try:
            cosmos_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            # get_default_database() reads DB name from the URI path segment
            cosmos_db = cosmos_client.get_default_database()
            await cosmos_client.admin.command("ping")
            print(f"✅ [image-analysis-agent] Cosmos DB connected — db={cosmos_db.name}")
        except Exception as e:
            print(f"⚠️  [image-analysis-agent] Cosmos DB connection failed: {e}")
    else:
        print("ℹ️  [image-analysis-agent] MONGODB_URI not set — findings will be empty")


# ─── Helper ───────────────────────────────────────────────────────────────────
def to_object_id(user_id: str):
    """Cast userId string to ObjectId for Cosmos DB queries (matches api-gateway pattern)."""
    try:
        return ObjectId(user_id)
    except Exception:
        return user_id


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/analyze")
async def get_image_analysis(userId: str):
    """
    Returns all image-related findings for a patient from Cosmos DB.

    Reads from 'medicalrecords' collection — the same collection written to by:
    - Azure Function (Blob trigger → OCR → processingStatus='processed')
    - diagnostic-agent-service (GPT-4o Vision analysis)

    Records with blobUrl or extractedText are treated as document/scan findings.
    """
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")

    findings = []
    image_count = 0

    if cosmos_db is not None:
        user_oid = to_object_id(userId)
        # Match whether userId was stored as ObjectId (Mongoose) or plain string
        user_filter = {"$or": [{"userId": user_oid}, {"userId": userId}]}
        try:
            # Fetch records that have been processed (have OCR text or a blob)
            cursor = cosmos_db["medicalrecords"].find(
                {
                    "$and": [
                        user_filter,
                        {"$or": [
                            {"processingStatus": "processed"},
                            {"processingStatus": "analyzed"},
                            {"processingStatus": "empty"},
                            {"blobUrl": {"$exists": True, "$ne": None}},
                        ]},
                    ]
                },
                {
                    "_id": 0,
                    "title": 1,
                    "category": 1,
                    "date": 1,
                    "description": 1,
                    "extractedText": 1,
                    "processingStatus": 1,
                    "blobUrl": 1,
                    "blobName": 1,
                }
            ).sort("createdAt", -1).limit(5)

            async for doc in cursor:
                title = (doc.get("title") or "").lower()
                category = (doc.get("category") or "").lower()
                extracted = doc.get("extractedText") or ""

                # Classify the document type from title/category keywords
                scan_type = "Document"
                for keywords, label in [
                    (["mri", "brain", "spine", "magnetic"], "MRI"),
                    (["xray", "x-ray", "chest", "cxr", "radiograph"], "X-Ray"),
                    (["ct", "computed", "tomography"], "CT Scan"),
                    (["ultrasound", "echo", "cardiac", "sonograph"], "Ultrasound"),
                    (["lab", "blood", "cbc", "glucose", "lipid", "urine", "pathology"], "Lab Report"),
                    (["prescription", "rx", "medication"], "Prescription"),
                ]:
                    if any(k in title or k in category for k in keywords):
                        scan_type = label
                        break

                findings.append({
                    "title": doc.get("title", "Unnamed Record"),
                    "category": doc.get("category", "Unknown"),
                    "date": doc.get("date", ""),
                    "scan_type": scan_type,
                    "status": doc.get("processingStatus", "unknown"),
                    "has_extracted_text": bool(extracted),
                    # First 500 chars of OCR text, or description as fallback
                    "summary": (
                        extracted[:500] + ("..." if len(extracted) > 500 else "")
                        if extracted
                        else doc.get("description", "No analysis text available.")
                    ),
                    "blob_url": doc.get("blobUrl"),
                })
                image_count += 1

        except Exception as e:
            print(f"⚠️  [image-analysis-agent] Cosmos DB query error: {e}")

    return {
        "findings": findings,
        "image_count": image_count,
        "has_data": image_count > 0,
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "image-analysis-agent",
        "cosmos": "connected" if cosmos_db is not None else "not configured",
    }
