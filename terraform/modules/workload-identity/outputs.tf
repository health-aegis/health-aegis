output "client_id" {
  description = "Client ID of the user-assigned managed identity (use as annotation on Kubernetes ServiceAccount)"
  value       = azurerm_user_assigned_identity.this.client_id
}

output "principal_id" {
  description = "Principal (object) ID of the user-assigned managed identity (use for RBAC role assignments)"
  value       = azurerm_user_assigned_identity.this.principal_id
}

output "id" {
  description = "Resource ID of the user-assigned managed identity"
  value       = azurerm_user_assigned_identity.this.id
}

output "tenant_id" {
  description = "Tenant ID of the user-assigned managed identity"
  value       = azurerm_user_assigned_identity.this.tenant_id
}
