output "function_app_id" {
  description = "Resource ID of the Function App"
  value       = azurerm_linux_function_app.this.id
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = azurerm_linux_function_app.this.name
}

output "function_app_hostname" {
  description = "Default hostname of the Function App"
  value       = azurerm_linux_function_app.this.default_hostname
}

output "principal_id" {
  description = "Principal ID of the Function App's system-assigned managed identity"
  value       = azurerm_linux_function_app.this.identity[0].principal_id
}
