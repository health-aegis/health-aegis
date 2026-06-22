# ---------------------------------------------------------------------------
# PRODUCTION environment — high-availability, hardened, monitored
#
# Purpose : live patient-facing workloads
# Nodes   : 2 system + 3 user (auto-scales to 5 each)
# VMs     : Standard_D4s_v3 (4 vCPU / 16 GB) — 2× the test VMs
# Cost    : ~$800–1200/month (multi-node, redundant, larger VMs)
#
# Differences from test:
#   - Larger VMs (D4s_v3 vs D2s_v3)
#   - More nodes for HA (2 system + 3 user)
#   - Separate VNet CIDR (10.2.0.0/16) — no overlap with test
#   - Separate ACR / KV / CosmosDB / Storage names
#   - Separate state file (aegis-prod.tfstate)
#   - Owner tag: aegis-prod-team
#
# Sensitive vars — set via environment before applying:
#   $env:TF_VAR_postgres_admin_password = "..."  (use a strong password ≥16 chars)
#   $env:TF_VAR_jwt_secret              = "..."  (≥32 random chars)
#   $env:TF_VAR_azure_ai_endpoint       = "..."
#   $env:TF_VAR_azure_ai_key            = "..."
#   $env:TF_VAR_gemini_api_key          = "..."
#
# IMPORTANT: Review terraform plan output carefully before applying to prod.
#   Never run terraform apply -auto-approve in production.
# ---------------------------------------------------------------------------

# ── Global ────────────────────────────────────────────────────────────────────
environment         = "prod"
workload_name       = "aegis"
owner               = "aegis-prod-team"
resource_group_name = "rg-aegis-prod"
location            = "eastus"

# ── Networking ────────────────────────────────────────────────────────────────
# Separate CIDR range from test (10.1.x.x) to allow VNet peering if needed
vnet_address_space   = "10.2.0.0/16"
public_subnet_cidr   = "10.2.30.0/24"
aks_subnet_cidr      = "10.2.0.0/22"
pe_subnet_cidr       = "10.2.10.0/24"
postgres_subnet_cidr = "10.2.11.0/24"
bastion_subnet_cidr  = "10.2.20.0/26"

# ── AKS — multi-node HA configuration ────────────────────────────────────────
kubernetes_version              = "1.35"
node_count                      = 2                 # system pool: 2 nodes (auto-scales to 4) — HA
node_vm_size                    = "Standard_D4s_v3" # 4 vCPU / 16 GB — double the test size
user_node_count                 = 3                 # user pool:   3 nodes (auto-scales to 5) — HA
user_node_vm_size               = "Standard_D4s_v3"
kubernetes_namespace            = "aegis-prod"
kubernetes_service_account_name = "aegis-workload-sa"

# ── Resource names (all must be globally unique) ──────────────────────────────
acr_name                    = "aegisprodacr"
key_vault_name              = "aegis-kv-prod"
cosmosdb_account_name       = "aegis-csdb-prod"
storage_account_name_prefix = "aegishealthprod"
doc_intelligence_name       = "aegis-docai-prod"
communication_service_name  = "aegis-prod-comm"

# ── Storage containers ────────────────────────────────────────────────────────
storage_container_names = ["health-records", "medical-images", "uploads", "exports"]

# ── PostgreSQL ────────────────────────────────────────────────────────────────
postgres_db_name = "aegis_imaging"
# postgres_admin_password → TF_VAR_postgres_admin_password  (strong, ≥16 chars)

# ── CosmosDB ──────────────────────────────────────────────────────────────────
cosmosdb_database_name = "aegis_db"

# ── Deployer (fill in before first apply) ────────────────────────────────────
# az ad signed-in-user show --query id -o tsv
deployer_object_id = ""

# curl ifconfig.me  (prod: restrict to your CI/CD agent IP, not 0.0.0.0)
deployer_ip = "0.0.0.0"

# ── App Gateway ───────────────────────────────────────────────────────────────
# WAF_v2 SKU with OWASP 3.2 rules in Prevention mode — required for production.
enable_waf = true

# ── Key Vault (prod hardening) ─────────────────────────────────────────────────
# Purge protection prevents permanent deletion for soft_delete_retention_days.
key_vault_purge_protection = true
key_vault_retention_days   = 90

# ── Function App ──────────────────────────────────────────────────────────────
# acs_sender_address is derived automatically from the ACS email domain — no manual step needed.
app_base_url = "https://aegishealth.io"
