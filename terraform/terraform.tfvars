# ---------------------------------------------------------------------------
# Aegis Health — Terraform variable values (dev environment)
#
# IMPORTANT: Do NOT commit sensitive values to source control.
# For secrets (postgres_admin_password, jwt_secret, etc.) use one of:
#   1. Environment variables: export TF_VAR_postgres_admin_password="..."
#   2. Azure Key Vault + terraform-vault-provider
#   3. GitHub Actions secrets → TF_VAR_* env vars
#   4. A separate secrets.auto.tfvars file listed in .gitignore
# ---------------------------------------------------------------------------

environment         = "dev"
workload_name       = "aegis"
owner               = "aegis-team" # Owner tag applied to all resources
resource_group_name = "rg-aegis"
location            = "centralindia"

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
vnet_address_space   = "10.0.0.0/16"
public_subnet_cidr   = "10.0.30.0/24" # public-facing resources (App Gateway, LB front-ends)
aks_subnet_cidr      = "10.0.0.0/22"  # private — AKS nodes & pods
pe_subnet_cidr       = "10.0.10.0/24" # private — PaaS private endpoints
postgres_subnet_cidr = "10.0.11.0/24" # private — PostgreSQL Flexible Server
bastion_subnet_cidr  = "10.0.20.0/26" # Bastion management subnet

# ---------------------------------------------------------------------------
# AKS
# ---------------------------------------------------------------------------
kubernetes_version   = "1.29"
node_count           = 1 # system node pool (kube-system workloads)
node_vm_size         = "Standard_D2s_v3"
user_node_count      = 1 # user node pool (application workloads)
user_node_vm_size    = "Standard_D2s_v3"
kubernetes_namespace = "aegis"

# ---------------------------------------------------------------------------
# Resource names
# ---------------------------------------------------------------------------
acr_name                    = "aegisacraswin"
key_vault_name              = "aegis-kv-aswin"
cosmosdb_account_name       = "aegis-csdb-aswin"
storage_account_name_prefix = "aegishealthst"
doc_intelligence_name       = "aegis-docai-aswin"
communication_service_name  = "aegis-dev-comm"

# ---------------------------------------------------------------------------
# Blob containers
# ---------------------------------------------------------------------------
storage_container_names = ["health-records", "medical-images", "uploads", "exports"]

# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------
postgres_db_name = "aegis_imaging"
# Set via environment variable: export TF_VAR_postgres_admin_password="YourStrongP@ssw0rd!"

# ---------------------------------------------------------------------------
# CosmosDB
# ---------------------------------------------------------------------------
cosmosdb_database_name = "aegis_db"

# ---------------------------------------------------------------------------
# Deployer configuration
# ---------------------------------------------------------------------------
# Your AAD object ID — az ad signed-in-user show --query id -o tsv
deployer_object_id = "" # Fill in before first apply

# Your public IP for Key Vault network ACL — curl ifconfig.me
deployer_ip = "0.0.0.0" # Replace with your public IP before first apply

# ---------------------------------------------------------------------------
# External API keys (set via TF_VAR_* env vars, not here)
# ---------------------------------------------------------------------------
# azure_ai_endpoint = ""   # set via TF_VAR_azure_ai_endpoint
# azure_ai_key      = ""   # set via TF_VAR_azure_ai_key
# gemini_api_key    = ""   # set via TF_VAR_gemini_api_key
# jwt_secret        = ""   # set via TF_VAR_jwt_secret
