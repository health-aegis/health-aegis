variable "function_app_name" {
  description = "Name of the Azure Function App (globally unique)"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group for all function app resources"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "func_storage_account_name" {
  description = "Storage account name for Function App internal state (max 24 chars, alphanumeric lowercase)"
  type        = string
}

variable "service_plan_name" {
  description = "Name of the App Service Plan (Consumption Y1)"
  type        = string
}

variable "key_vault_id" {
  description = "Resource ID of the Key Vault — used to create the access policy for the function's managed identity"
  type        = string
}

variable "key_vault_name" {
  description = "Name of the Key Vault — used to build Key Vault reference strings in app settings"
  type        = string
}

variable "tenant_id" {
  description = "Azure AD tenant ID"
  type        = string
}

variable "acs_sender_address" {
  description = <<-EOT
    Sender email address for Azure Communication Services.
    Format: DoNotReply@<domain>.azurecomm.net
    Find after first apply: Azure Portal → Communication Services → Email → Domains.
  EOT
  type        = string
  default     = ""
}

variable "app_base_url" {
  description = "Base URL of the Aegis web application (used in notification email links)"
  type        = string
  default     = "https://aegishealth.io"
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
