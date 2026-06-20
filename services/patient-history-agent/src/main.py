"""
patient-history-agent — Aegis Health Multi-Agent Platform

Retrieves patient history from Cosmos DB (MongoDB API) and PostgreSQL.
Uses the same MONGODB_URI and DATABASE_URL env vars as the existing platform
(injected from Key Vault via the aegis-kv-secrets K8s Secret).

Exposes: GET /history?userId={id}
         GET /health
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

app = FastAPI(title="Patient History Agent — Aegis Health")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Cosmos DB (MongoDB API) ──────────────────────────────────────────────────
# Key Vault CSI injects this as MONGODB_URI (same secret name as api-gateway uses).
# e.g. mongodb://aegisdb:KEY@aegisdb.mongo.cosmos.azure.com:10255/ai-health-agent?ssl=true&...
MONGODB_URI = os.getenv("MONGODB_URI", "")
cosmos_client = None
cosmos_db = None


@app.on_event("startup")
async def startup():
    global cosmos_client, cosmos_db
    if MONGODB_URI:
        try:
            cosmos_client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            # get_default_database() reads the DB name from the URI path segment
            # (same DB that Mongoose api-gateway connects to)
            cosmos_db = cosmos_client.get_default_database()
            await cosmos_client.admin.command("ping")
            print(f"✅ [patient-history-agent] Cosmos DB connected — db={cosmos_db.name}")
        except Exception as e:
            print(f"⚠️  [patient-history-agent] Cosmos DB connection failed: {e}")
    else:
        print("ℹ️  [patient-history-agent] MONGODB_URI not set — Cosmos data will be empty")


# ─── PostgreSQL ───────────────────────────────────────────────────────────────
# Key Vault CSI injects this as DATABASE_URL
# e.g. postgresql://aegis:PASS@postgres-service:5432/imaging
DATABASE_URL = os.getenv("DATABASE_URL", "")
SessionLocal = None

if DATABASE_URL:
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        print("✅ [patient-history-agent] PostgreSQL connected")
    except Exception as e:
        print(f"⚠️  [patient-history-agent] PostgreSQL setup failed: {e}")


# ─── Helper ───────────────────────────────────────────────────────────────────
def to_object_id(user_id: str):
    """
    The existing platform stores userId as a MongoDB ObjectId.
    The JWT decoded userId (req.userId = decoded.id) is the ObjectId hex string.
    Motor queries must use ObjectId, not the raw string.
    """
    try:
        return ObjectId(user_id)
    except Exception:
        return user_id  # non-ObjectId fallback (should not happen in production)


def clean_doc(doc):
    """
    Recursively convert BSON ObjectId values to strings so the document is
    JSON-serializable. Mongoose adds an _id ObjectId to every sub-document
    (e.g. medication `schedules` entries), which FastAPI's encoder cannot
    serialize — this strips that landmine across all collections.
    """
    if isinstance(doc, dict):
        return {k: clean_doc(v) for k, v in doc.items()}
    if isinstance(doc, list):
        return [clean_doc(v) for v in doc]
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/history")
async def get_patient_history(userId: str):
    """
    Aggregates patient data from Cosmos DB and PostgreSQL.
    Returns: medical_records, medications, appointments, image_records
    """
    if not userId:
        raise HTTPException(status_code=400, detail="userId is required")

    result = {
        "medical_records": [],
        "medications": [],
        "appointments": [],
        "image_records": [],
        "record_count": 0,
        "medication_count": 0,
    }

    user_oid = to_object_id(userId)
    # Match whether userId was stored as ObjectId (Mongoose default) or plain string
    user_filter = {"$or": [{"userId": user_oid}, {"userId": userId}]}

    # ── Cosmos DB queries ─────────────────────────────────────────────────────
    if cosmos_db is not None:
        # Each collection in its own try/except so one failure never silences others
        try:
            records_cursor = cosmos_db["medicalrecords"].find(
                user_filter,
                {
                    "_id": 0, "title": 1, "category": 1, "date": 1,
                    "description": 1, "notes": 1, "extractedText": 1,
                    "processingStatus": 1, "blobUrl": 1
                }
            ).sort("createdAt", -1).limit(10)
            async for doc in records_cursor:
                result["medical_records"].append(clean_doc(doc))
        except Exception as e:
            print(f"⚠️  [patient-history-agent] medicalrecords query error: {e}")

        try:
            meds_cursor = cosmos_db["medications"].find(
                user_filter,
                {
                    "_id": 0, "name": 1, "dosage": 1, "frequency": 1,
                    "missedCount": 1, "startDate": 1, "schedules": 1,
                    "instructions": 1
                }
            ).limit(10)
            async for doc in meds_cursor:
                result["medications"].append(clean_doc(doc))
        except Exception as e:
            print(f"⚠️  [patient-history-agent] medications query error: {e}")

        try:
            appts_cursor = cosmos_db["appointments"].find(
                {"$and": [user_filter, {"status": "Scheduled"}]},
                {
                    "_id": 0, "dateTime": 1, "provider": 1,
                    "specialty": 1, "purpose": 1, "status": 1
                }
            ).limit(5)
            async for doc in appts_cursor:
                result["appointments"].append(clean_doc(doc))
        except Exception as e:
            print(f"⚠️  [patient-history-agent] appointments query error: {e}")

    # ── PostgreSQL: image upload records ──────────────────────────────────────
    # imaging-service stores user_id as a string (UUID or the frontend userId)
    if SessionLocal is not None:
        try:
            db = SessionLocal()
            rows = db.execute(
                text(
                    "SELECT id, filename, blob_url, uploaded_at, status, diagnostic_report "
                    "FROM image_records WHERE user_id = :uid "
                    "ORDER BY id DESC LIMIT 10"
                ),
                {"uid": userId}
            ).fetchall()
            db.close()

            for row in rows:
                result["image_records"].append({
                    "id": row[0],
                    "filename": row[1],
                    "blob_url": row[2],
                    "uploaded_at": str(row[3]) if row[3] else None,
                    "status": row[4],
                    "diagnostic_report": row[5],
                })
        except Exception as e:
            print(f"⚠️  [patient-history-agent] PostgreSQL query error: {e}")

    result["record_count"] = len(result["medical_records"])
    result["medication_count"] = len(result["medications"])

    return result


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "patient-history-agent",
        "cosmos": "connected" if cosmos_db is not None else "not configured",
        "postgres": "connected" if SessionLocal is not None else "not configured",
    }
