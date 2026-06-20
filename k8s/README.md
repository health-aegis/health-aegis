# Aegis K8s Manifests

Kubernetes manifests organised following numbered-folder Kustomize conventions, mirroring the Finance-Flowapp pattern.

## Structure

```
k8s/
├── 01-rbac/                  ← Service accounts, roles, role-bindings
├── 02-secrets/               ← Secrets & ConfigMaps
├── 03-storage/               ← PersistentVolumeClaims
├── 04-network-policies/      ← Pod-to-pod network policies
├── 05-data/
│   └── mongodb/              ← MongoDB StatefulSet / Deployment + Service
├── 06-backend/
│   ├── api-gateway/          ← API Gateway Deployment + Service + HPA
│   └── notification-worker/  ← Background worker Deployment
├── 07-frontend/              ← React SPA Deployment + Service
├── 08-gateway/               ← Nginx Ingress + Gateway API HTTPRoutes
│   └── routes/
├── base/                     ← Kustomize base (references all numbered folders)
├── dev/                      ← Dev overlay (1 replica, aegis-dev namespace)
│   └── patches/
└── prod/                     ← Prod overlay (scaled resources, aegis-prod namespace)
    └── patches/
```

## Apply

### Dev
```bash
kubectl apply -k k8s/dev/
```

### Prod
```bash
kubectl apply -k k8s/prod/
```

### Base only (no environment)
```bash
kubectl apply -k k8s/base/
```

## Secrets

Before applying, replace placeholder secrets:
```bash
# Encode your Gemini API key
echo -n "your_actual_gemini_api_key" | base64
# Paste result into k8s/02-secrets/secrets.yaml → GEMINI_API_KEY
```
