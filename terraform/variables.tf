# ---------------------------------------------------------------------------
# Root variables — all configurable parameters for the Aegis platform
# Sensitive variables (passwords, API keys) have no defaults and must be
# passed via terraform.tfvars, environment variables (TF_VAR_*), or a
# secrets manager. Never hardcode secret values in .tf files.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Global
# ---------------------------------------------------------------------------
variable "environment" {
  description = "Deployment environment (dev / staging / prod)"
  type        = string
  default     = "dev"
}

variable "owner" {
  description = "Owner of the deployment — applied as an 'Owner' tag on all resources"
  type        = string
  default     = "aegis-team"
}

variable "workload_name" {
  description = "Short workload identifier included in all resource names (e.g. 'aegis')"
  type        = string
  default     = "aegis"
}

variable "resource_group_name" {
  description = "Name of the main resource group for all Aegis resources"
  type        = string
}

variable "location" {
  description = "Azure region for all resources"
  type        = string
  default     = "centralindia"
}

# ---------------------------------------------------------------------------
# Networking
# ---------------------------------------------------------------------------
variable "vnet_address_space" {
  description = "CIDR block for the virtual network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "aks_subnet_cidr" {
  description = "CIDR for the AKS node/pod subnet (Azure CNI)"
  type        = string
  default     = "10.0.0.0/22"
}

variable "pe_subnet_cidr" {
  description = "CIDR for the private endpoints subnet"
  type        = string
  default     = "10.0.10.0/24"
}

variable "postgres_subnet_cidr" {
  description = "CIDR for the PostgreSQL Flexible Server delegated subnet"
  type        = string
  default     = "10.0.11.0/24"
}

variable "public_subnet_cidr" {
  description = "CIDR for the public-facing subnet (App Gateway, external load balancer front-ends)"
  type        = string
  default     = "10.0.30.0/24"
}

variable "bastion_subnet_cidr" {
  description = "CIDR for AzureBastionSubnet (minimum /27, must use this exact subnet name)"
  type        = string
  default     = "10.0.20.0/26"
}

# ---------------------------------------------------------------------------
# AKS
# ---------------------------------------------------------------------------
variable "kubernetes_version" {
  description = "Kubernetes version for the AKS cluster (e.g. '1.29')"
  type        = string
  default     = "1.29"
}

variable "node_count" {
  description = "Initial and minimum node count for the default node pool"
  type        = number
  default     = 1
}

variable "node_vm_size" {
  description = "VM size for AKS default node pool (e.g. Standard_D2s_v3)"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "user_node_count" {
  description = "Initial and minimum node count for the AKS user node pool"
  type        = number
  default     = 1
}

variable "user_node_vm_size" {
  description = "VM size for the AKS user node pool"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace for Aegis application workloads"
  type        = string
  default     = "aegis"
}

variable "kubernetes_service_account_name" {
  description = "Name of the Kubernetes ServiceAccount to federate with workload identity"
  type        = string
  default     = "aegis-workload-sa"
}

# ---------------------------------------------------------------------------
# ACR
# ---------------------------------------------------------------------------
variable "acr_name" {
  description = "Name of the Azure Container Registry (globally unique, alphanumeric only)"
  type        = string
}

# ---------------------------------------------------------------------------
# Key Vault
# ---------------------------------------------------------------------------
variable "key_vault_name" {
  description = "Name of the Azure Key Vault (globally unique, 3-24 chars)"
  type        = string
}

variable "deployer_object_id" {
  description = <<-EOT
    Object ID of the AAD principal (user or service principal) running Terraform.
    This principal is granted full access to Key Vault for secret management.
    Find with: az ad signed-in-user show --query id -o tsv
  EOT
  type        = string
  default     = ""
}

variable "deployer_ip" {
  description = <<-EOT
    Public IP of the machine running Terraform. Whitelisted in Key Vault network ACL.
    Find with: curl ifconfig.me
    Set to "0.0.0.0" to skip (not recommended for production).
  EOT
  type        = string
  default     = "0.0.0.0"
}

# ---------------------------------------------------------------------------
# CosmosDB
# ---------------------------------------------------------------------------
variable "cosmosdb_account_name" {
  description = "Name of the CosmosDB account (globally unique)"
  type        = string
}

variable "cosmosdb_database_name" {
  description = "Name of the MongoDB database to create in CosmosDB"
  type        = string
  default     = "aegis_db"
}

# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------
variable "storage_account_name_prefix" {
  description = <<-EOT
    Prefix for the storage account name. A random suffix is NOT added — the
    full name must be globally unique, 3-24 lowercase alphanumeric chars.
    Example: "aegishealthst"
  EOT
  type        = string
}

variable "storage_container_names" {
  description = "List of blob container names to create in the storage account"
  type        = list(string)
  default     = ["health-records", "medical-images", "uploads", "exports"]
}

# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------
variable "postgres_db_name" {
  description = "Name of the PostgreSQL database to create"
  type        = string
  default     = "aegis_imaging"
}

variable "postgres_admin_password" {
  description = "Administrator password for the PostgreSQL Flexible Server"
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# Document Intelligence
# ---------------------------------------------------------------------------
variable "doc_intelligence_name" {
  description = "Name of the Azure Document Intelligence (Form Recognizer) resource"
  type        = string
}

# ---------------------------------------------------------------------------
# Communication Services
# ---------------------------------------------------------------------------
variable "communication_service_name" {
  description = "Name of the Azure Communication Service resource"
  type        = string
  default     = "" # auto-generated from prefix if empty
}

# ---------------------------------------------------------------------------
# Secrets to store in Key Vault
# (values passed at apply time — never committed to source control)
# ---------------------------------------------------------------------------
variable "jwt_secret" {
  description = "JWT signing secret for the Aegis API"
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_api_key" {
  description = "Google Gemini API key for AI features"
  type        = string
  sensitive   = true
  default     = ""
}

variable "azure_ai_endpoint" {
  description = "Azure AI Services endpoint URL"
  type        = string
  default     = ""
}

variable "azure_ai_key" {
  description = "Azure AI Services primary key"
  type        = string
  sensitive   = true
  default     = ""
}

# ---------------------------------------------------------------------------
# Function App
# ---------------------------------------------------------------------------
variable "app_base_url" {
  description = "Base URL of the Aegis web application (used in notification email links)"
  type        = string
  default     = "https://aegishealth.io"
}
