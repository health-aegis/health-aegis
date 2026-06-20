# Aegis Health — Helm Chart (AKS)

Helmified deployment of the Aegis Health platform, replacing the raw manifests in
[`../k8s`](../k8s) (which used `__PLACEHOLDER__` text substitution). The chart is the
canonical way to deploy onto the AKS cluster provisioned by
[`../terraform-state-locking`](../terraform-state-locking).

## What it deploys (namespace `aegis`)

- **10 backend microservices** — api-gateway, health-records, medication, ai, imaging,
  diagnostic-agent, coordinator-agent, image-analysis-agent, patient-history-agent,
  notification-worker (worker, no Service).
- **client** — React SPA (nginx), plus its nginx ConfigMap.
- **postgres** — in-cluster StatefulSet (imaging metadata). MongoDB is **external**
  (Azure Cosmos DB), injected via the Key Vault secret `kv-mongodb-uri`.
- **ServiceAccount** with Azure Workload Identity, **SecretProviderClass** (Key Vault CSI),
  **ConfigMap**, and a **KGateway** Gateway + HTTPRoutes (`/api` → api-gateway, `/` → client).

All pods mount the CSI secrets volume, which syncs Key Vault secrets into the
`aegis-kv-secrets` K8s Secret consumed via `envFrom`.

## Prerequisites (provisioned by Terraform)

The AKS cluster must already have, from `terraform apply`:
- Key Vault CSI add-on + Workload Identity enabled (AKS module)
- A user-assigned Managed Identity with a federated credential for
  `system:serviceaccount:aegis:aegis-workload-identity` and Key Vault `Get/List`
- KGateway + Gateway API CRDs (kgateway module)
- Images pushed to ACR (`build_and_push.ps1`)

## Deploy

Pull the values that come from Terraform outputs and install:

```bash
cd terraform-state-locking
CLIENT_ID=$(terraform output -raw workload_identity_client_id)
KV_NAME=$(terraform output -raw key_vault_name)
TENANT_ID=$(az account show --query tenantId -o tsv)
ACR_LOGIN=$(terraform output -raw acr_login_server)

az aks get-credentials -g aswin-rg -n aegis-aks --admin

helm upgrade --install aegis ../helm/aegis-health \
  --namespace aegis --create-namespace \
  --set global.acrLoginServer="$ACR_LOGIN" \
  --set workloadIdentity.clientId="$CLIENT_ID" \
  --set keyVault.name="$KV_NAME" \
  --set keyVault.tenantId="$TENANT_ID"
```

> If the Terraform outputs above are not defined, add them to
> `terraform-state-locking/outputs.tf` (see the "Terraform outputs" note in the repo),
> or read the values from the portal / `az` CLI.

## Verify

```bash
helm lint helm/aegis-health
helm template aegis helm/aegis-health --namespace aegis | kubectl apply --dry-run=client -f -
kubectl -n aegis get pods,svc,gateway,httproute
kubectl -n aegis get gateway aegis-gateway -o jsonpath='{.status.addresses[0].value}'   # public IP
```

## Key values

| Value | Purpose |
|-------|---------|
| `global.acrLoginServer` | ACR login server, e.g. `aegisacraswin.azurecr.io` |
| `global.imageTag` | Image tag to deploy (default `latest`) |
| `workloadIdentity.clientId` | Managed Identity client-id (SA annotation + CSI) |
| `keyVault.name` / `keyVault.tenantId` | Key Vault for the CSI provider |
| `services[]` | Per-service name/port/replicas/healthPath/resources |
| `postgres.storageClass` | AKS storage class (default `managed-csi`) |
| `gateway.enabled` | Toggle the KGateway Gateway + routes |
