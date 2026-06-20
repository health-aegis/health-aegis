$RG = "aswin-rg"
$SUB = "c00de6c7-c9b6-40f3-97a4-cbc8d3bdb52f"
$MONGO = "YOUR_COSMOS_DB_CONNECTION_STRING"
$JWT = "MyInsuranceJwtSecret2026"
$VERSION = "v1.0.6"

# ─── Helper: update container app env vars via REST API (avoids & parsing issues in PowerShell) ───
function Update-ContainerApp {
    param(
        [string]$Name,
        [string]$Image,
        [array]$EnvVars
    )
    Write-Host "Updating $Name to $Image..."
    $body = @{
        properties = @{
            template = @{
                containers = @(@{
                    name = $Name
                    image = $Image
                    resources = @{ cpu = 0.5; memory = "1Gi" }
                    env = $EnvVars
                })
            }
        }
    } | ConvertTo-Json -Depth 10
    $tmpFile = [System.IO.Path]::GetTempFileName() + ".json"
    $body | Set-Content -Path $tmpFile -Encoding utf8
    az rest --method PATCH `
        --uri "https://management.azure.com/subscriptions/$SUB/resourceGroups/$RG/providers/Microsoft.App/containerApps/$Name`?api-version=2023-05-01" `
        --body "@$tmpFile" --headers "Content-Type=application/json" | Out-Null
    Remove-Item $tmpFile -ErrorAction SilentlyContinue
    Write-Host "  -> $Name updated successfully."
}

# ─── api-gateway ──────────────────────────────────────────────────────────────
Update-ContainerApp -Name "api-gateway" -Image "insurancecr.azurecr.io/aegis-api-gateway:$VERSION" -EnvVars @(
    @{ name = "MONGODB_URI"; value = $MONGO },
    @{ name = "JWT_SECRET";  value = $JWT },
    @{ name = "PORT";        value = "5000" }
)

# NOTE: health-records-service, medication-service, and ai-service are DEACTIVATED.
# All routing now goes through api-gateway which handles everything internally.

# ─── notification-worker ──────────────────────────────────────────────────────
Update-ContainerApp -Name "notification-worker" -Image "insurancecr.azurecr.io/aegis-notification-worker:$VERSION" -EnvVars @(
    @{ name = "MONGODB_URI"; value = $MONGO }
)

# ─── client ───────────────────────────────────────────────────────────────────
Write-Host "Updating client..."
az containerapp update --name client --resource-group $RG --image "insurancecr.azurecr.io/aegis-client:$VERSION" | Out-Null
Write-Host "  -> client updated successfully."

Write-Host ""
Write-Host "All containers successfully updated to $VERSION"
