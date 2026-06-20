# ⚠️ DEPRECATED — Replaced by domain microservices

This service has been split into three independent domain services:

| New Service | Routes | Port |
|---|---|---|
| `health-records-service` | `/api/history`, `/api/appointments` | 5001 |
| `medication-service` | `/api/medications`, `/api/caregiver`, `/api/status` | 5002 |
| `ai-service` | `/api/ai/chat` | 5003 |

This directory is kept for historical reference only.
The active services are under `services/health-records-service/`, `services/medication-service/`, and `services/ai-service/`.
