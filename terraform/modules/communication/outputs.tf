output "communication_service_id" {
  description = "Resource ID of the Azure Communication Service"
  value       = azurerm_communication_service.this.id
}

output "email_domain_id" {
  description = "Resource ID of the email communication service domain"
  value       = azurerm_email_communication_service_domain.this.id
}

output "primary_connection_string" {
  description = "Primary connection string for the Azure Communication Service"
  value       = azurerm_communication_service.this.primary_connection_string
  sensitive   = true
}

output "email_service_name" {
  description = "Name of the email communication service"
  value       = azurerm_email_communication_service.this.name
}
