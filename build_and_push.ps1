<#
.SYNOPSIS
    Build and push all Aegis Health Docker images to Azure Container Registry.
.USAGE
    .\build_and_push.ps1 -AcrName "aegisacr1234"

Build context rules (relative to repo root):
  - api-gateway  : root "."  -- Dockerfile copies shared/ and services/api-gateway/
  - health-records-service  : own dir   -- self-contained, Dockerfile COPYs src/
  - medication-service      : own dir   -- self-contained
  - ai-service              : own dir   -- self-contained
  - notification-worker     : own dir   -- self-contained, has tsconfig.json + src/
  - imaging-service         : own dir   -- Python service
  - diagnostic-agent-service: own dir   -- Python service
  - coordinator-agent       : own dir   -- Python service
  - image-analysis-agent    : own dir   -- Python service
  - patient-history-agent   : own dir   -- Python service
  - client                  : root "."  -- Dockerfile copies client/ subtree
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$AcrName
)

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

function Write-Step { param($msg) Write-Host "`n>>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red }

Write-Step "Logging into ACR: $AcrName"
az acr login --name $AcrName
$ACR_SERVER = (az acr show --name $AcrName --query loginServer -o tsv)
Write-OK "ACR Server: $ACR_SERVER"

# Each entry: (ImageName, BuildContextRelativeToRoot, DockerfileRelativeToRoot)
$IMAGES = @(
    @("api-gateway",              ".",                                   "services/api-gateway/Dockerfile"),
    @("health-records-service",   "services/health-records-service",    "services/health-records-service/Dockerfile"),
    @("medication-service",       "services/medication-service",        "services/medication-service/Dockerfile"),
    @("ai-service",               "services/ai-service",                "services/ai-service/Dockerfile"),
    @("notification-worker",      "services/notification-worker",       "services/notification-worker/Dockerfile"),
    @("imaging-service",          "services/imaging-service",           "services/imaging-service/Dockerfile"),
    @("diagnostic-agent-service", "services/diagnostic-agent-service",  "services/diagnostic-agent-service/Dockerfile"),
    @("coordinator-agent",        "services/coordinator-agent",         "services/coordinator-agent/Dockerfile"),
    @("image-analysis-agent",     "services/image-analysis-agent",      "services/image-analysis-agent/Dockerfile"),
    @("patient-history-agent",    "services/patient-history-agent",     "services/patient-history-agent/Dockerfile"),
    @("client",                   ".",                                   "client/Dockerfile")
)

$failed = @()
foreach ($img in $IMAGES) {
    $name = $img[0]; $ctx = $img[1]; $df = $img[2]
    $tag  = "$ACR_SERVER/${name}:latest"
    Write-Step "[$name] Building..."
    docker build -t $tag -f (Join-Path $ROOT $df) (Join-Path $ROOT $ctx)
    if ($LASTEXITCODE -ne 0) { Write-Fail "$name build failed"; $failed += $name; continue }
    Write-Step "[$name] Pushing to ACR..."
    docker push $tag
    if ($LASTEXITCODE -ne 0) { Write-Fail "$name push failed"; $failed += $name; continue }
    Write-OK "$name pushed as $tag"
}

if ($failed.Count -eq 0) {
    Write-Host "`nAll images pushed to $ACR_SERVER" -ForegroundColor Green
} else {
    Write-Host "`nFailed images: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}
