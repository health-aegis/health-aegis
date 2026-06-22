variable "key_vault_name" {
  description = "Name of the Key Vault (globally unique, 3-24 alphanumeric/hyphens)"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "pe_subnet_id" {
  description = "Resource ID of the private endpoint subnet"
  type        = string
}

variable "vnet_id" {
  description = "Resource ID of the VNet for private DNS zone VNet link"
  type        = string
}

variable "deployer_object_id" {
  description = <<-EOT
    Object ID of the principal running Terraform (user or service principal).
    This principal is granted full CRUD access to Key Vault secrets so it can
    write initial secret values during terraform apply.
  EOT
  type        = string
}

variable "deployer_ip" {
  description = <<-EOT
    Public IP address of the machine running Terraform (e.g. your workstation).
    This IP is whitelisted in the Key Vault network ACL so the deployer can
    read/write secrets. Set to "" to disable public access (requires VNet runner).
    Find your IP with: curl ifconfig.me
  EOT
  type        = string
  default     = ""
}

variable "workload_identity_principal_id" {
  description = "Principal ID of the workload identity that pods will use to read secrets"
  type        = string
}

variable "secrets" {
  description = <<-EOT
    Map of secret name to secret value. All values are sensitive.
    Secret names become the Key Vault secret name (must be 1-127 alphanumeric/hyphens).
    Example: { "kv-mongodb-uri" = "mongodb://..." }
  EOT
  type        = map(string)
  sensitive   = true
  default     = {}
}

variable "purge_protection_enabled" {
  description = "Enable purge protection. Once true it cannot be set back to false. Use true for production."
  type        = bool
  default     = false
}

variable "soft_delete_retention_days" {
  description = "Number of days to retain soft-deleted secrets (7-90). Use 90 for production."
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to Key Vault resources"
  type        = map(string)
  default     = {}
}
