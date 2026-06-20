# Aegis Health — AKS Deployment Guide
## Azure Kubernetes Service + Azure Key Vault + KGateway

---

## Overview

This guide documents the migration of **Aegis Health** from Azure Container Apps to a fully production-grade **Azure Kubernetes Service (AKS)** deployment, featuring:

- 🔐 **Azure Key Vault** — centralized secret management via Workload Identity
- 🚪 **KGateway** — Kubernetes-native Gateway API (no legacy Ingress)
- 📦 **Azure Container Registry (ACR)** — private image registry
- 📈 **Horizontal Pod Autoscaling (HPA)** — CPU/memory based auto-scaling
- 🐘 **PostgreSQL StatefulSet** — persistent in-cluster database for imaging metadata
- 🗄️ **MongoDB (Cosmos DB)** — managed health records storage

---

## Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════╗
║                    Azure (aswin-rg / centralindia)               ║
║                                                                    ║
║  ┌─────────────┐    ┌─────────────────────────────────────────┐  ║
║  │  Azure Key  │    │        AKS Cluster (aegis-aks)           │  ║
║  │   Vault     │◄───┤  ┌──────────────────────────────────┐   │  ║
║  │             │    │  │   Namespace: aegis                │   │  ║
║  │ kv-mongodb  │    │  │                                   │   │  ║
║  │ kv-jwt      │    │  │  [KGateway] ─── Azure LB ─── 🌍  │   │  ║
║  │ kv-postgres │    │  │       │                           │   │  ║
║  │ kv-storage  │    │  │  /api/*  ──► api-gateway :5000   │   │  ║
║  │ kv-gemini   │    │  │  /*      ──► client      :80     │   │  ║
║  │ kv-azure-ai │    │  │                                   │   │  ║
║  └─────────────┘    │  │  api-gateway ──► health-records   │   │  ║
║                     │  │              ──► medication        │   │  ║
║  ┌─────────────┐    │  │              ──► ai-service        │   │  ║
║  │    ACR      │    │  │              ──► imaging :5004 (FastAPI) │ ║
║  │  (images)   │───►│  │              ──► diagnostic :5005 (FastAPI)║
║  └─────────────┘    │  │                                   │   │  ║
║                     │  │  postgres StatefulSet + PVC 5Gi   │   │  ║
║                     │  └──────────────────────────────────-┘   │  ║
║                     └─────────────────────────────────────────-─┘  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Microservices

| Service | Language | Port | Database | Description |
|---|---|---|---|---|
| `api-gateway` | Node.js | 5000 | MongoDB | Central orchestrator, WebSocket hub |
| `health-records-service` | Node.js | 5001 | MongoDB | Patient records CRUD |
| `medication-service` | Node.js | 5002 | MongoDB | Medication management |
| `ai-service` | Node.js | 5003 | MongoDB | AI/Gemini integration (Agent 1) |
| `notification-worker` | Node.js | — | MongoDB | Background notification processor |
| `imaging-service` | **FastAPI** | 5004 | **PostgreSQL** + Azure Blob | Medical image upload/storage |
| `diagnostic-agent-service` | **FastAPI** | 5005 | — | **Azure AI Foundry** (Agent 2) |
| `client` | React/Nginx | 80 | — | Frontend SPA |

---

## Secret Management (Azure Key Vault)

All secrets are stored in Azure Key Vault. **No secrets exist in Kubernetes manifests.**

### How It Works

```
Azure Key Vault
    │
    │  (Workload Identity — OIDC Federation)
    │
    ▼
Secrets Store CSI Driver (AKS add-on)
    │  (mounted as CSI volume in each pod)
    │
    ▼
K8s Secret: aegis-kv-secrets
    │  (envFrom: secretRef)
    │
    ▼
All pod containers get env vars automatically
```

### Key Vault Secrets Reference

| Key Vault Secret | Kubernetes Env Var | Used By |
|---|---|---|
| `kv-mongodb-uri` | `MONGODB_URI` | All Node.js services |
| `kv-jwt-secret` | `JWT_SECRET` | `api-gateway` |
| `kv-postgres-url` | `DATABASE_URL` | `imaging-service` |
| `kv-postgres-password` | `POSTGRES_PASSWORD` | PostgreSQL pod |
| `kv-azure-storage-conn` | `AZURE_STORAGE_CONNECTION_STRING` | `imaging-service` |
| `kv-gemini-api-key` | `GEMINI_API_KEY` | `ai-service` |
| `kv-azure-ai-endpoint` | `AZURE_AI_ENDPOINT` | `diagnostic-agent-service` |
| `kv-azure-ai-key` | `AZURE_AI_KEY` | `diagnostic-agent-service` |
| `kv-appinsights-conn` | `APPLICATIONINSIGHTS_CONNECTION_STRING` | All services |

> **Automatic rotation:** AKS polls Key Vault every 2 minutes for secret updates. No pod restarts needed for secret rotation.

---

## KGateway (Kubernetes Gateway API)

KGateway replaces the traditional `Ingress` resource with the modern **Kubernetes Gateway API**.

### Resources

| Resource | Kind | File |
|---|---|---|
| `aegis-gateway` | `Gateway` | `08-gateway/gateway.yaml` |
| `aegis-api-route` | `HTTPRoute` | `08-gateway/httproute.yaml` |
| `aegis-frontend-route` | `HTTPRoute` | `08-gateway/httproute.yaml` |

### Routing Rules

```
GET/POST /api/*   ──► api-gateway-service:5000
GET      /*       ──► client-service:80
```

### Why KGateway?

| Feature | Legacy Ingress | KGateway |
|---|---|---|
| Routing expressiveness | Limited | Rich (header, method, query) |
| Traffic splitting | Annotation-based | Native spec |
| Protocol support | HTTP/S only | HTTP, gRPC, TCP |
| Role separation | Single resource | Gateway + Route separation |
| Standardization | Controller-specific | Kubernetes SIG-standardized |

---

## Directory Structure

```
k8s/
├── 00-namespace/
│   └── namespace.yaml                  # aegis namespace
├── 01-rbac/
│   ├── workload-identity-sa.yaml       # ServiceAccount (Workload Identity)
│   ├── roles.yaml                      # RBAC roles
│   └── service-accounts.yaml
├── 02-secrets/
│   ├── secret-provider-class.yaml      # ⭐ Azure Key Vault CSI mapping
│   └── configmap.yaml                  # Non-sensitive config
├── 05-data/
│   ├── mongodb/                        # MongoDB (or Cosmos DB)
│   └── postgres/
│       ├── statefulset.yaml            # PostgreSQL StatefulSet + PVC
│       └── service.yaml                # Headless service
├── 06-backend/
│   ├── api-gateway/                    # Node.js orchestrator
│   ├── health-records-service/         # Node.js
│   ├── medication-service/             # Node.js
│   ├── ai-service/                     # Node.js + Gemini
│   ├── notification-worker/            # Node.js background worker
│   ├── imaging-service/                # ⭐ FastAPI + PostgreSQL + Blob
│   └── diagnostic-agent/              # ⭐ FastAPI + Azure AI Foundry
├── 07-frontend/
│   └── deployment.yaml                 # React/Nginx
├── 08-gateway/
│   ├── gateway.yaml                    # ⭐ KGateway Gateway resource
│   └── httproute.yaml                  # ⭐ HTTPRoute rules
├── hpa.yaml                            # HPA for api-gateway, imaging, frontend
└── scripts/
    └── provision-aks.ps1               # ⭐ End-to-end provisioning script
```

---

## Deployment Steps

### Prerequisites

```powershell
# Install required tools
winget install Microsoft.AzureCLI
winget install Helm.Helm
winget install Kubernetes.kubectl

# Login to Azure
az login
az account set --subscription "<your-subscription-id>"
```

### Full Automated Deployment (Recommended)

```powershell
# Run the provisioning script — it does EVERYTHING
.\k8s\scripts\provision-aks.ps1
```

The script will:
1. Prompt for secrets (or read from env vars)
2. Create ACR and push all 8 Docker images
3. Create AKS cluster with all add-ons
4. Create Key Vault and load all secrets
5. Set up Workload Identity
6. Install KGateway
7. Apply all manifests in the correct order

### Manual Step-by-Step

```powershell
# 1. Create ACR
az acr create --resource-group aswin-rg --name aegisacr1234 --sku Basic

# 2. Build and push images
.\build_and_push.ps1 -AcrName "aegisacr1234"

# 3. Create AKS
az aks create `
  --resource-group aswin-rg `
  --name aegis-aks `
  --node-count 3 `
  --node-vm-size Standard_D2s_v3 `
  --enable-oidc-issuer `
  --enable-workload-identity `
  --enable-addons azure-keyvault-secrets-provider `
  --attach-acr aegisacr1234

# 4. Get kubectl context
az aks get-credentials --resource-group aswin-rg --name aegis-aks

# 5. Install Gateway API CRDs
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml

# 6. Install KGateway
helm install kgateway oci://cr.kgateway.dev/kgateway-helm/kgateway `
  --namespace kgateway-system --create-namespace --version 1.0.4

# 7. Apply manifests (after substituting placeholders)
kubectl apply -f k8s/ --recursive
```

---

## Verification Commands

```bash
# All pods healthy?
kubectl get pods -n aegis

# Secrets synced from Key Vault?
kubectl get secret aegis-kv-secrets -n aegis

# Gateway external IP?
kubectl get gateway -n aegis

# HTTPRoutes configured?
kubectl get httproute -n aegis

# HPA status?
kubectl get hpa -n aegis

# Describe a pod for full debug info
kubectl describe pod <pod-name> -n aegis

# View pod logs
kubectl logs -l app=api-gateway -n aegis --tail=50
kubectl logs -l app=imaging-service -n aegis --tail=50
kubectl logs -l app=diagnostic-agent-service -n aegis --tail=50
```

---

## Autoscaling

| Deployment | Min | Max | Trigger |
|---|---|---|---|
| `api-gateway` | 2 | 5 | CPU > 70% |
| `imaging-service` | 1 | 3 | CPU > 70% |
| `client` | 2 | 4 | CPU > 70% |

---

## Updating Images

When you push new code:

```powershell
# Rebuild and push a specific service
.\build_and_push.ps1 -AcrName "aegisacr1234"

# Force AKS to pull the new image (rollout restart)
kubectl rollout restart deployment/api-gateway -n aegis
kubectl rollout restart deployment/imaging-service -n aegis

# Monitor rollout
kubectl rollout status deployment/api-gateway -n aegis
```

---

## Updating Secrets

```powershell
# Update a secret in Key Vault — AKS auto-rotates within 2 minutes
az keyvault secret set `
  --vault-name "aegis-kv-1234" `
  --name "kv-jwt-secret" `
  --value "new-secret-value"

# Force immediate rotation (optional)
kubectl rollout restart deployment/api-gateway -n aegis
```

---

## Cost Estimate (Central India)

| Resource | SKU | ~Monthly Cost |
|---|---|---|
| AKS nodes (3×) | Standard_D2s_v3 | ~$150 |
| ACR | Basic | ~$5 |
| Key Vault | Standard | ~$1 |
| Azure Blob Storage | LRS | ~$2 |
| PostgreSQL (in-cluster) | In-cluster pod | $0 |
| **Total** | | **~$158/mo** |

---

## Troubleshooting

### Pod stuck in `Pending`
```bash
kubectl describe pod <pod-name> -n aegis
# Usually: resource quota, PVC binding, or image pull error
```

### Secrets not syncing from Key Vault
```bash
kubectl describe secretproviderclass aegis-kv-secret-provider -n aegis
# Check: OIDC issuer URL, managed identity client ID, Key Vault name
```

### Gateway has no EXTERNAL-IP
```bash
kubectl get svc -n kgateway-system
# Wait 2-3 minutes for Azure LoadBalancer to provision
```

### 502 from Gateway → API
```bash
kubectl logs -l app=api-gateway -n aegis
# Check: MONGODB_URI is correct, JWT_SECRET is set
```
