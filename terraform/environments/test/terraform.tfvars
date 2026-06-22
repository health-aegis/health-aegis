# ---------------------------------------------------------------------------
# TEST environment — lightweight, cheap, disposable
#
# Purpose : integration testing, dev validation, demo runs
# Nodes   : 1 system + 1 user (auto-scales to 3)
# VMs     : Standard_D2s_v3 (2 vCPU / 8 GB)
# Cost    : ~$120–160/month (single node pair, no redundancy)
#
# Sensitive vars — set via environment before applying:
#   $env:TF_VAR_postgres_admin_password = "..."
#   $env:TF_VAR_jwt_secret              = "..."
#   $env:TF_VAR_azure_ai_endpoint       = "..."
#   $env:TF_VAR_azure_ai_key            = "..."
#   $env:TF_VAR_gemini_api_key          = "..."
# ---------------------------------------------------------------------------

# ── Global ────────────────────────────────────────────────────────────────────
environment         = "test"
workload_name       = "aegis"
owner               = "aegis-test-team"
resource_group_name = "rg-aegis-test"
location            = "centralindia"

# ── Networking ────────────────────────────────────────────────────────────────
vnet_address_space   = "10.1.0.0/16"
public_subnet_cidr   = "10.1.30.0/24"
aks_subnet_cidr      = "10.1.0.0/22"
pe_subnet_cidr       = "10.1.10.0/24"
postgres_subnet_cidr = "10.1.11.0/24"
bastion_subnet_cidr  = "10.1.20.0/26"

# ── AKS — single node pools, small VMs ───────────────────────────────────────
kubernetes_version              = "1.35"
node_count                      = 1 # system pool: 1 node (auto-scales to 3)
node_vm_size                    = "Standard_D2s_v3"
user_node_count                 = 1 # user pool:   1 node (auto-scales to 3)
user_node_vm_size               = "Standard_D2s_v3"
kubernetes_namespace            = "aegis"
kubernetes_service_account_name = "aegis-workload-sa"

# ── Resource names (all must be globally unique) ──────────────────────────────
acr_name                    = "aegistestacr"
key_vault_name              = "aegis-kv-test"
cosmosdb_account_name       = "aegis-csdb-test"
storage_account_name_prefix = "aegishealthtest"
doc_intelligence_name       = "aegis-docai-test"
communication_service_name  = "aegis-test-comm"

# ── Storage containers ────────────────────────────────────────────────────────
storage_container_names = ["health-records", "medical-images", "uploads", "exports"]

# ── PostgreSQL ────────────────────────────────────────────────────────────────
postgres_db_name = "aegis_imaging"
# postgres_admin_password → TF_VAR_postgres_admin_password

# ── CosmosDB ──────────────────────────────────────────────────────────────────
cosmosdb_database_name = "aegis_db"

# ── Deployer (fill in before first apply) ────────────────────────────────────
# az ad signed-in-user show --query id -o tsv
deployer_object_id = ""

# curl ifconfig.me
deployer_ip = "0.0.0.0"

# ── Function App ──────────────────────────────────────────────────────────────
# acs_sender_address is derived automatically from the ACS email domain — no manual step needed.
app_base_url = "https://aegishealth.io"
