<#
.SYNOPSIS
    Aegis Health — AKS + Azure Key Vault + KGateway Provisioning Script
.DESCRIPTION
    End-to-end provisioning script that:
      1. Creates an Azure Container Registry (ACR)
      2. Builds and pushes all Docker images to ACR
      3. Creates an AKS cluster with Workload Identity + Key Vault CSI add-on
      4. Creates Azure Key Vault and loads all application secrets
      5. Sets up Workload Identity (federated credentials)
      6. Installs KGateway (Kubernetes Gateway API)
      7. Substitutes placeholders and applies all Kubernetes manifests

.NOTES
    Prerequisites:
      - Azure CLI (az) installed and logged in: az login
      - Docker Desktop running
      - kubectl installed
      - helm installed
      - PowerShell 7+

    Usage:
      .\k8s\scripts\provision-aks.ps1

    To supply secrets non-interactively, set env vars before running:
      $env:MONGODB_URI = "..."
      $env:JWT_SECRET  = "..."
      etc.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — Edit these values as needed
# ──────────────────────────────────────────────────────────────────────────────
$RESOURCE_GROUP   = "aswin-rg"
$LOCATION         = "centralindia"
$AKS_CLUSTER      = "aegis-aks"
$AKS_VERSION      = "1.29"
$NODE_COUNT       = 3
$NODE_VM_SIZE     = "Standard_D2s_v3"
$NAMESPACE        = "aegis"
$IDENTITY_NAME    = "aegis-workload-identity"
$RANDOM_SUFFIX    = (Get-Random -Maximum 9999).ToString("0000")
$ACR_NAME         = "aegisacr$RANDOM_SUFFIX"       # e.g. aegisacr1234
$KEY_VAULT_NAME   = "aegis-kv-$RANDOM_SUFFIX"      # e.g. aegis-kv-1234
$K8S_MANIFESTS    = Join-Path $PSScriptRoot "..\"   # Path to k8s/ root

# KGateway version
$KGATEWAY_VERSION = "1.0.4"
$GATEWAY_API_CRDS = "https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml"

# ──────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ──────────────────────────────────────────────────────────────────────────────
function Write-Step($msg) { Write-Host "`n🔷 $msg" -ForegroundColor Cyan }
function Write-OK($msg)   { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }

function Invoke-AzCLI($args) {
    $result = az @args 2>&1
    if ($LASTEXITCODE -ne 0) { throw "az $($args[0]) failed: $result" }
    return $result | ConvertFrom-Json -ErrorAction SilentlyContinue
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 0 — Collect secrets interactively if not set as env vars
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Collecting application secrets"

function Get-Secret($name, $envKey, $default = "") {
    $envVal = [System.Environment]::GetEnvironmentVariable($envKey)
    if ($envVal) { return $envVal }
    $prompt = "Enter value for $name"
    if ($default) { $prompt += " (press Enter for default: '$default')" }
    $val = Read-Host $prompt
    if (-not $val -and $default) { return $default }
    return $val
}

$MONGODB_URI         = Get-Secret "MongoDB URI" "MONGODB_URI" "mongodb://localhost:27017/ai-health-agent"
$JWT_SECRET          = Get-Secret "JWT Secret" "JWT_SECRET" "change-me-in-production-$(Get-Random)"
$POSTGRES_PASSWORD   = Get-Secret "PostgreSQL Password" "POSTGRES_PASSWORD" "AegisP@ss$(Get-Random -Maximum 999)"
$GEMINI_API_KEY      = Get-Secret "Gemini API Key" "GEMINI_API_KEY" "mock-key"
$AZURE_STORAGE_CONN  = Get-Secret "Azure Storage Connection String" "AZURE_STORAGE_CONNECTION_STRING" "UseDevelopmentStorage=true"
$AZURE_AI_ENDPOINT   = Get-Secret "Azure AI Foundry Endpoint" "AZURE_AI_ENDPOINT" ""
$AZURE_AI_KEY        = Get-Secret "Azure AI Foundry Key" "AZURE_AI_KEY" "mock-key"
$APPINSIGHTS_CONN    = Get-Secret "Application Insights Connection String" "APPLICATIONINSIGHTS_CONNECTION_STRING" ""

# Build the full PostgreSQL connection URL from the password
$POSTGRES_URL = "postgresql://aegis:${POSTGRES_PASSWORD}@postgres-service:5432/imaging"

Write-OK "Secrets collected"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 1 — Azure Resource Group
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Ensuring Resource Group: $RESOURCE_GROUP in $LOCATION"
az group create --name $RESOURCE_GROUP --location $LOCATION | Out-Null
Write-OK "Resource group ready"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 2 — Azure Container Registry
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Creating Azure Container Registry: $ACR_NAME"
az acr create `
    --resource-group $RESOURCE_GROUP `
    --name $ACR_NAME `
    --sku Basic `
    --admin-enabled true | Out-Null

$ACR_LOGIN_SERVER = (az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query loginServer -o tsv)
Write-OK "ACR created: $ACR_LOGIN_SERVER"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 3 — Build and Push All Docker Images
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Building and pushing Docker images to ACR"

az acr login --name $ACR_NAME

$PROJECT_ROOT = Join-Path $PSScriptRoot "..\.."
$IMAGES = @(
    @{ Name = "api-gateway";             Context = "services/api-gateway";             Dockerfile = "services/api-gateway/Dockerfile" },
    @{ Name = "health-records-service";  Context = ".";                                Dockerfile = "services/health-records-service/Dockerfile" },
    @{ Name = "medication-service";      Context = ".";                                Dockerfile = "services/medication-service/Dockerfile" },
    @{ Name = "ai-service";              Context = ".";                                Dockerfile = "services/ai-service/Dockerfile" },
    @{ Name = "notification-worker";     Context = ".";                                Dockerfile = "services/notification-worker/Dockerfile" },
    @{ Name = "imaging-service";         Context = "services/imaging-service";         Dockerfile = "services/imaging-service/Dockerfile" },
    @{ Name = "diagnostic-agent-service"; Context = "services/diagnostic-agent-service"; Dockerfile = "services/diagnostic-agent-service/Dockerfile" },
    @{ Name = "client";                  Context = ".";                                Dockerfile = "client/Dockerfile" },
    # ── Multi-Agent Layer ────────────────────────────────────────────────────────
    @{ Name = "coordinator-agent";       Context = "services/coordinator-agent";       Dockerfile = "services/coordinator-agent/Dockerfile" },
    @{ Name = "image-analysis-agent";    Context = "services/image-analysis-agent";    Dockerfile = "services/image-analysis-agent/Dockerfile" },
    @{ Name = "patient-history-agent";   Context = "services/patient-history-agent";   Dockerfile = "services/patient-history-agent/Dockerfile" }
)

foreach ($img in $IMAGES) {
    $tag = "$ACR_LOGIN_SERVER/$($img.Name):latest"
    Write-Host "  📦 Building $($img.Name)..." -ForegroundColor Gray
    docker build -t $tag -f (Join-Path $PROJECT_ROOT $img.Dockerfile) (Join-Path $PROJECT_ROOT $img.Context)
    docker push $tag
    Write-OK "$($img.Name) pushed → $tag"
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 4 — AKS Cluster
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Creating AKS cluster: $AKS_CLUSTER (this takes ~5 minutes)"
az aks create `
    --resource-group $RESOURCE_GROUP `
    --name $AKS_CLUSTER `
    --kubernetes-version $AKS_VERSION `
    --node-count $NODE_COUNT `
    --node-vm-size $NODE_VM_SIZE `
    --enable-oidc-issuer `
    --enable-workload-identity `
    --enable-addons azure-keyvault-secrets-provider `
    --enable-secret-rotation `
    --rotation-poll-interval 2m `
    --generate-ssh-keys `
    --attach-acr $ACR_NAME | Out-Null

Write-OK "AKS cluster created"

# Get credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --overwrite-existing
Write-OK "kubectl context set to: $AKS_CLUSTER"

$OIDC_ISSUER = (az aks show --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER --query "oidcIssuerProfile.issuerUrl" -o tsv)
$TENANT_ID   = (az account show --query tenantId -o tsv)
Write-OK "OIDC Issuer: $OIDC_ISSUER"
Write-OK "Tenant ID:   $TENANT_ID"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 5 — Azure Key Vault
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Creating Azure Key Vault: $KEY_VAULT_NAME"
az keyvault create `
    --name $KEY_VAULT_NAME `
    --resource-group $RESOURCE_GROUP `
    --location $LOCATION `
    --enable-rbac-authorization false | Out-Null
Write-OK "Key Vault created"

Write-Step "Loading secrets into Key Vault"
$secrets = @{
    "kv-mongodb-uri"        = $MONGODB_URI
    "kv-jwt-secret"         = $JWT_SECRET
    "kv-postgres-url"       = $POSTGRES_URL
    "kv-postgres-password"  = $POSTGRES_PASSWORD
    "kv-azure-storage-conn" = $AZURE_STORAGE_CONN
    "kv-gemini-api-key"     = $GEMINI_API_KEY
    "kv-azure-ai-endpoint"  = $AZURE_AI_ENDPOINT
    "kv-azure-ai-key"       = $AZURE_AI_KEY
    "kv-appinsights-conn"   = $APPINSIGHTS_CONN
}
foreach ($kv in $secrets.GetEnumerator()) {
    az keyvault secret set --vault-name $KEY_VAULT_NAME --name $kv.Key --value $kv.Value | Out-Null
    Write-OK "  Stored: $($kv.Key)"
}

# ──────────────────────────────────────────────────────────────────────────────
# STEP 6 — Workload Identity (Managed Identity + Federated Credentials)
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Creating User Assigned Managed Identity: $IDENTITY_NAME"
az identity create `
    --name $IDENTITY_NAME `
    --resource-group $RESOURCE_GROUP | Out-Null

$IDENTITY_CLIENT_ID    = (az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query clientId -o tsv)
$IDENTITY_PRINCIPAL_ID = (az identity show --name $IDENTITY_NAME --resource-group $RESOURCE_GROUP --query principalId -o tsv)
Write-OK "Managed Identity Client ID: $IDENTITY_CLIENT_ID"

Write-Step "Creating federated credential (OIDC → Managed Identity)"
az identity federated-credential create `
    --name "aegis-federated-credential" `
    --identity-name $IDENTITY_NAME `
    --resource-group $RESOURCE_GROUP `
    --issuer $OIDC_ISSUER `
    --subject "system:serviceaccount:${NAMESPACE}:aegis-workload-identity" `
    --audience "api://AzureADTokenExchange" | Out-Null
Write-OK "Federated credential created"

Write-Step "Granting Managed Identity access to Key Vault secrets"
az keyvault set-policy `
    --name $KEY_VAULT_NAME `
    --object-id $IDENTITY_PRINCIPAL_ID `
    --secret-permissions get list | Out-Null
Write-OK "Key Vault policy set"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 7 — Install Kubernetes Gateway API CRDs + KGateway
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Installing Kubernetes Gateway API CRDs"
kubectl apply -f $GATEWAY_API_CRDS
Write-OK "Gateway API CRDs installed"

Write-Step "Installing KGateway via Helm"
helm upgrade --install kgateway `
    oci://cr.kgateway.dev/kgateway-helm/kgateway `
    --namespace kgateway-system `
    --create-namespace `
    --version $KGATEWAY_VERSION `
    --wait
Write-OK "KGateway installed"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 8 — Substitute Placeholders in K8s Manifests
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Substituting placeholders in Kubernetes manifests"

# Work on a temp copy to avoid modifying source files permanently
$TEMP_K8S = Join-Path $env:TEMP "aegis-k8s-deploy"
if (Test-Path $TEMP_K8S) { Remove-Item -Recurse -Force $TEMP_K8S }
Copy-Item -Recurse (Join-Path $PSScriptRoot "..") $TEMP_K8S

Get-ChildItem -Recurse $TEMP_K8S -Filter "*.yaml" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $content = $content -replace '__ACR_NAME__',                   $ACR_LOGIN_SERVER
    $content = $content -replace '__MANAGED_IDENTITY_CLIENT_ID__', $IDENTITY_CLIENT_ID
    $content = $content -replace '__KEY_VAULT_NAME__',             $KEY_VAULT_NAME
    $content = $content -replace '__TENANT_ID__',                  $TENANT_ID
    Set-Content $_.FullName $content
}
Write-OK "Placeholders substituted in $TEMP_K8S"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 9 — Apply Kubernetes Manifests (ordered)
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Applying Kubernetes manifests to AKS"

$manifestOrder = @(
    "00-namespace\namespace.yaml",
    "01-rbac\workload-identity-sa.yaml",
    "01-rbac\roles.yaml",
    "02-secrets\configmap.yaml",
    "02-secrets\secret-provider-class.yaml",
    "05-data\postgres\service.yaml",
    "05-data\postgres\statefulset.yaml",
    "05-data\mongodb\service.yaml",
    "05-data\mongodb\deployment.yaml",
    "06-backend\api-gateway\service.yaml",
    "06-backend\api-gateway\deployment.yaml",
    "06-backend\health-records-service\deployment.yaml",
    "06-backend\medication-service\deployment.yaml",
    "06-backend\ai-service\deployment.yaml",
    "06-backend\notification-worker\deployment.yaml",
    "06-backend\imaging-service\deployment.yaml",
    "06-backend\diagnostic-agent\deployment.yaml",
    # ── Multi-Agent Layer ────────────────────────────────────────────────────────
    "06-backend\coordinator-agent\deployment.yaml",
    "06-backend\image-analysis-agent\deployment.yaml",
    "06-backend\patient-history-agent\deployment.yaml",
    "07-frontend\nginx-configmap.yaml",
    "07-frontend\deployment.yaml",
    "08-gateway\gateway.yaml",
    "08-gateway\httproute.yaml",
    "hpa.yaml"
)

foreach ($path in $manifestOrder) {
    $fullPath = Join-Path $TEMP_K8S $path
    if (Test-Path $fullPath) {
        Write-Host "  📄 Applying: $path" -ForegroundColor Gray
        kubectl apply -f $fullPath --recursive
    }
}

Write-OK "All manifests applied"

# ──────────────────────────────────────────────────────────────────────────────
# STEP 10 — Summary
# ──────────────────────────────────────────────────────────────────────────────
Write-Step "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod --all -n $NAMESPACE --timeout=180s

Write-Host "`n╔══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host   "║        ✅  AEGIS HEALTH — AKS DEPLOYMENT COMPLETE       ║" -ForegroundColor Green
Write-Host   "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  ACR Login Server    : $ACR_LOGIN_SERVER"
Write-Host "  AKS Cluster         : $AKS_CLUSTER"
Write-Host "  Key Vault           : $KEY_VAULT_NAME"
Write-Host "  Namespace           : $NAMESPACE"
Write-Host ""
Write-Host "  Pods status:" -ForegroundColor Cyan
kubectl get pods -n $NAMESPACE
Write-Host ""
Write-Host "  Gateway (wait for EXTERNAL-IP):" -ForegroundColor Cyan
kubectl get gateway -n $NAMESPACE
Write-Host ""
Write-Host "  To get the app URL:" -ForegroundColor Yellow
Write-Host "    kubectl get svc -n kgateway-system"
Write-Host ""
Write-Host "  To view secrets from Key Vault:" -ForegroundColor Yellow
Write-Host "    kubectl get secret aegis-kv-secrets -n $NAMESPACE -o yaml"
