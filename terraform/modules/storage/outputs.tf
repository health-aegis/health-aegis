output "account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.this.name
}

output "id" {
  description = "Resource ID of the storage account"
  value       = azurerm_storage_account.this.id
}

output "primary_connection_string" {
  description = "Primary connection string for the storage account"
  value       = azurerm_storage_account.this.primary_connection_string
  sensitive   = true
}

output "primary_blob_endpoint" {
  description = "Primary blob service endpoint URL"
  value       = azurerm_storage_account.this.primary_blob_endpoint
}
