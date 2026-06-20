# ---------------------------------------------------------------------------
# deploy.ps1 — Helper script to plan/apply a specific Aegis environment
#
# Usage:
#   .\deploy.ps1 -Env test  -Action plan
#   .\deploy.ps1 -Env test  -Action apply
#   .\deploy.ps1 -Env prod  -Action plan
#   .\deploy.ps1 -Env prod  -Action apply
#   .\deploy.ps1 -Env test  -Action destroy   # CAREFUL
# ---------------------------------------------------------------------------
param(
    [Parameter(Mandatory)][ValidateSet("test","prod")] [string]$Env,
    [Parameter(Mandatory)][ValidateSet("plan","apply","destroy","output")] [string]$Action
)

$ErrorActionPreference = "Stop"
$BackendConfig = "environments/$Env/backend.hcl"
$VarFile       = "environments/$Env/terraform.tfvars"

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  Aegis Terraform — ENV: $($Env.ToUpper())   ACTION: $($Action.ToUpper())" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# ── Check required sensitive vars are set ─────────────────────────────────────
$required = @("TF_VAR_postgres_admin_password","TF_VAR_jwt_secret")
foreach ($v in $required) {
    if (-not [System.Environment]::GetEnvironmentVariable($v)) {
        Write-Warning "Missing env var: $v"
        Write-Host "Set it with:  `$env:$v = 'your-value'" -ForegroundColor Yellow
        if ($Action -ne "output") { exit 1 }
    }
}

# ── Init (reconfigure switches state backend to this env) ─────────────────────
Write-Host ">>> terraform init -backend-config=$BackendConfig -reconfigure" -ForegroundColor Green
terraform init -backend-config=$BackendConfig -reconfigure
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# ── Run the requested action ──────────────────────────────────────────────────
switch ($Action) {
    "plan" {
        Write-Host ">>> terraform plan -var-file=$VarFile -out=tfplan.$Env" -ForegroundColor Green
        terraform plan -var-file=$VarFile -out="tfplan.$Env"
    }
    "apply" {
        if (-not (Test-Path "tfplan.$Env")) {
            Write-Host "No plan file found. Running plan first..." -ForegroundColor Yellow
            terraform plan -var-file=$VarFile -out="tfplan.$Env"
        }
        if ($Env -eq "prod") {
            Write-Host ""
            Write-Host "  *** PRODUCTION APPLY — Review the plan above carefully ***" -ForegroundColor Red
            $confirm = Read-Host "  Type 'yes' to apply to PRODUCTION"
            if ($confirm -ne "yes") { Write-Host "Aborted."; exit 0 }
        }
        Write-Host ">>> terraform apply tfplan.$Env" -ForegroundColor Green
        terraform apply "tfplan.$Env"
        Remove-Item "tfplan.$Env" -ErrorAction SilentlyContinue
    }
    "destroy" {
        Write-Host ""
        Write-Host "  *** DESTROY — This will delete ALL $($Env.ToUpper()) resources ***" -ForegroundColor Red
        $confirm = Read-Host "  Type '$Env' to confirm destroy"
        if ($confirm -ne $Env) { Write-Host "Aborted."; exit 0 }
        terraform destroy -var-file=$VarFile
    }
    "output" {
        terraform output
    }
}
