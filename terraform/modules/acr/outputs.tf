output "id" {
  description = "Resource ID of the container registry"
  value       = azurerm_container_registry.this.id
}

output "login_server" {
  description = "Login server FQDN of the container registry (e.g. myacr.azurecr.io)"
  value       = azurerm_container_registry.this.login_server
}

output "name" {
  description = "Name of the container registry"
  value       = azurerm_container_registry.this.name
}
