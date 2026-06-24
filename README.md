# Aegis Health

Aegis Health is a microservices-based healthcare management platform running on Azure Kubernetes Service. It handles medication tracking, medical record storage with OCR, DICOM image analysis, multi-agent AI diagnostics, and automated caregiver notifications. The frontend is a React SPA served through nginx; all backend services run as containerized workloads in AKS with secrets injected from Azure Key Vault via the CSI driver.

This repository contains the application source code, Dockerfiles, and CI/CD workflows. Infrastructure is provisioned separately from [health-aegis/terraform-aegis](https://github.com/health-aegis/terraform-aegis), and Kubernetes deployment manifests live in [health-aegis/k8s-manifests](https://github.com/health-aegis/k8s-manifests).

---

## Services

| Service | Runtime | Port | Responsibility |
|---|---|---|---|
| `api-gateway` | Node.js / TypeScript | 5000 | Single entry point; routes requests to all downstream services |
| `health-records-service` | Node.js / TypeScript | 5001 | Medical record upload and retrieval; triggers Azure Document Intelligence for OCR |
| `medication-service` | Node.js / TypeScript | 5002 | Prescription tracking and dosage scheduling |
| `ai-service` | Node.js / TypeScript | 5003 | Gemini API integration for health insights and Q&A |
| `imaging-service` | Python / FastAPI | 5004 | DICOM and general medical image ingestion; stores to Azure Blob Storage |
| `diagnostic-agent-service` | Python / FastAPI | 5005 | AI-based diagnostic analysis; calls image and history agents |
| `coordinator-agent` | Python / FastAPI | 8000 | Orchestrates multi-agent diagnostic workflows |
| `image-analysis-agent` | Python / FastAPI | 8001 | Runs AI analysis on medical images from Blob Storage |
| `patient-history-agent` | Python / FastAPI | 8002 | Summarizes patient history from CosmosDB for agent context |
| `notification-worker` | Node.js / TypeScript | (worker) | Polls for missed medication doses; sends caregiver alerts via Azure Service Bus and Azure Communication Services |
| `client` | React + Vite | 8080 | Patient and caregiver dashboards; served via nginx |

---

## Architecture

```
                        Internet
                           |
                    App Gateway (AGIC)
                           |
                    api-gateway :5000
                    /     |     \     \
          health-records  medication  ai-service  imaging-service
                    |                               |
              CosmosDB (MongoDB)            Azure Blob Storage
              + Doc Intelligence            + imaging-service DB (PostgreSQL)

     coordinator-agent :8000
      /              \
image-analysis-agent  patient-history-agent
      :8001                  :8002

notification-worker
      |
 Service Bus (notifications queue)
      |
Azure Communication Services (email)
```

All pods run in the `aegis-dev` or `aegis-prod` namespace on AKS. Secrets are synced from Azure Key Vault by the Secrets Store CSI driver into a Kubernetes Secret (`aegis-kv-secrets`), consumed via `envFrom`.

---

## Azure Services

| Service | Purpose |
|---|---|
| AKS | Kubernetes cluster (Azure CNI, Workload Identity, AGIC add-on) |
| Azure Container Registry (ACR) | Private Docker registry; AKS nodes pull without image pull secrets |
| Azure Key Vault | Runtime secrets; accessed via Workload Identity + CSI driver |
| Azure CosmosDB (MongoDB API) | Primary document store for health records, medications, appointments |
| Azure PostgreSQL Flexible Server | Relational store for imaging service metadata |
| Azure Blob Storage | Medical images, health record files, uploads |
| Azure Service Bus | `notifications` queue between notification-worker and downstream alert logic |
| Azure Communication Services | Email delivery for caregiver alerts |
| Azure Document Intelligence | OCR on uploaded health record documents |
| Azure Application Gateway | External load balancer with WAF; managed by AGIC in-cluster |
| Azure Monitor + Log Analytics | Cluster and application telemetry |

---

## Prerequisites

Before cloning this repo, you need:

- **Azure CLI** 2.55+, logged in with Contributor on the target subscription
- **Docker** 24+ with Buildx
- **Node.js** 20+ (local development only)
- **Python** 3.11+ (local development of FastAPI services only)
- **kubectl** 1.29+
- **Helm** 3.14+
- An AKS cluster provisioned from [terraform-aegis](https://github.com/health-aegis/terraform-aegis)
- The [k8s-manifests](https://github.com/health-aegis/k8s-manifests) repo with ArgoCD installed

For CI/CD, the following GitHub Actions secrets must be set on this repository:

| Secret | Description |
|---|---|
| `AZURE_CLIENT_ID` | Client ID of the service principal or managed identity used for OIDC login |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `ACR_NAME` | ACR registry name (without `.azurecr.io`) for dev builds |
| `PROD_ACR_NAME` | ACR registry name for production builds |
| `VITE_API_URL` | Backend URL injected into the client build |
| `GITOPS_PAT` | GitHub PAT with repo write access to `health-aegis/k8s-manifests` |
| `SONAR_TOKEN` | SonarCloud token for static analysis |
| `SNYK_TOKEN` | Snyk token for dependency scanning |
| `SMTP_HOST` / `SMTP_PORT` | SMTP server for build/deploy email notifications |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | SMTP credentials |
| `EMAIL_TO` | Recipient for pipeline notifications |
| `TF_VAR_POSTGRES_ADMIN_PASSWORD` | Passed through to Terraform (infra repo uses these too) |
| `TF_VAR_JWT_SECRET` | JWT signing secret written to Key Vault by Terraform |
| `TF_VAR_AZURE_AI_KEY` | Azure AI key written to Key Vault by Terraform |
| `TF_VAR_AZURE_AI_ENDPOINT` | Azure AI endpoint written to Key Vault by Terraform |
| `TF_VAR_GEMINI_API_KEY` | Gemini API key written to Key Vault by Terraform |

---

## Local Development

The simplest path is Docker Compose. It wires up all services including a local MongoDB instance.

```bash
# Copy and fill in the environment file
cp .env.example .env

# Start everything
docker compose up --build
```

The client is then available at `http://localhost:8080` and the API gateway at `http://localhost:5000`.

To run a single service without Docker:

```bash
# Node.js services (example: api-gateway)
cd services/api-gateway
npm install
npm run dev

# Python FastAPI services (example: imaging-service)
cd services/imaging-service
pip install -r requirements.txt
uvicorn main:app --reload --port 5004
```

### Required environment variables for local runs

Create `.env` files per service or export these from your shell:

| Variable | Used by | Description |
|---|---|---|
| `MONGODB_URI` | api-gateway, health-records, medication, ai-service | CosmosDB or local MongoDB connection string |
| `JWT_SECRET` | api-gateway | Token signing secret |
| `DATABASE_URL` | imaging-service | PostgreSQL connection string |
| `AZURE_STORAGE_CONNECTION_STRING` | health-records, imaging-service | Blob Storage connection string |
| `GEMINI_API_KEY` | ai-service, diagnostic-agent | Google Gemini API key |
| `AZURE_AI_ENDPOINT` | health-records-service | Document Intelligence endpoint |
| `AZURE_AI_KEY` | health-records-service | Document Intelligence key |
| `AZURE_SERVICE_BUS_CONNECTION_STRING` | notification-worker | Service Bus connection string |
| `AZURE_COMM_CONNECTION_STRING` | notification-worker | Azure Communication Services connection string |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | all services | Optional; enables Azure Monitor telemetry |

---

## CI/CD Pipeline

Three workflows handle the full delivery loop.

### build.yml

Triggered on push or pull request to `develop` or `main` when files under `services/`, `client/`, or `shared/` change.

1. **Prepare** — detects which services changed using `dorny/paths-filter`. On `develop` it tags the build `sha-<7-char commit>`. On `main` it auto-increments a semver tag by scanning commit messages for `feat:` or `BREAKING CHANGE`.
2. **Test** — runs `npm test` (Node) or `pytest` (Python) for each changed service.
3. **SonarCloud scan** — runs per changed service; organisation `health-aegis`.
4. **Snyk scan** — dependency vulnerability check; fails on HIGH or CRITICAL findings.
5. **Build** — builds Docker images via Buildx, saves them as GitHub Actions artifacts.
6. **Trivy scan** — vulnerability scan on the built image; HIGH/CRITICAL findings fail the pipeline. SARIF results are uploaded to the GitHub Security tab.
7. **Push** — loads artifact, authenticates to ACR via OIDC, and pushes the image. Only runs on `push` events (not PRs) and only if Trivy passed.
8. **Release** — on `main`, creates a GitHub Release for the semver tag.
9. **Notify** — sends a summary email regardless of pipeline outcome.

### deploy.yml

Triggered automatically after `build.yml` completes, or manually via `workflow_dispatch`.

- Resolves the target environment: `develop` branch maps to `dev`, `main` maps to `prod`.
- For `prod`, a manual approval gate through a GitHub Environment named `production` must be cleared before any service deploys.
- Calls the reusable `common-cd.yml` workflow per changed service. That workflow checks out `k8s-manifests`, updates the image tag in `environments/<env>/values.yaml` for the relevant service key using `yq`, commits, and pushes. ArgoCD detects the change and syncs.

### release-prod.yml

Triggered when a `v*.*.*` tag is pushed to `main` (which `build.yml` creates automatically).

1. Builds all 11 services (not just changed ones) against the prod ACR.
2. Trivy scans all images; any HIGH/CRITICAL failure blocks the release.
3. Manual approval gate via the `production` GitHub Environment.
4. Pushes all images to the prod ACR under the semver tag.
5. Updates `environments/prod/values.yaml` in `k8s-manifests` for all services.

---

## Repo Structure

```
.
├── .github/
│   └── workflows/
│       ├── build.yml            # CI: detect changes, test, scan, build, push
│       ├── deploy.yml           # CD: update k8s-manifests image tags
│       ├── release-prod.yml     # Production release: full rebuild + prod manifest update
│       ├── common-cd.yml        # Reusable: patches values.yaml and commits to k8s-manifests
│       └── sync-helm-charts.yml # Syncs chart templates back to k8s-manifests
├── client/                      # React + Vite frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Patient and caregiver dashboard pages
│   │   └── App.tsx
│   ├── nginx.conf               # nginx reverse proxy config
│   └── Dockerfile
├── services/
│   ├── api-gateway/             # Node.js/TypeScript
│   ├── health-records-service/  # Node.js/TypeScript
│   ├── medication-service/      # Node.js/TypeScript
│   ├── ai-service/              # Node.js/TypeScript
│   ├── notification-worker/     # Node.js/TypeScript
│   ├── imaging-service/         # Python/FastAPI
│   ├── diagnostic-agent-service/# Python/FastAPI
│   ├── coordinator-agent/       # Python/FastAPI
│   ├── image-analysis-agent/    # Python/FastAPI
│   └── patient-history-agent/   # Python/FastAPI
├── shared/                      # Shared TypeScript types used by Node services
├── terraform/                   # Terraform source (also lives in terraform-aegis repo)
├── docker-compose.yml           # Full stack local development
└── .env.example                 # Environment variable template
```

---

## Accessing the Application

After ArgoCD syncs the `k8s-manifests` changes to AKS, the Application Gateway public IP is the entry point.

```bash
# Get the public IP assigned to the Application Gateway ingress
kubectl get ingress -n aegis-dev

# Or retrieve directly via az cli
az network application-gateway show \
  --name <appgw-name> \
  --resource-group <resource-group> \
  --query "frontendIPConfigurations[0].publicIPAddress.id" -o tsv \
  | xargs az network public-ip show --ids --query ipAddress -o tsv
```

The configured hostname is `aegis-dev.b4n3xus.in` for dev (set in `environments/dev/values.yaml`). DNS must point to the Application Gateway IP.

All API traffic routes through the gateway to `api-gateway:5000`. The React client at `/` is served by the nginx container.
