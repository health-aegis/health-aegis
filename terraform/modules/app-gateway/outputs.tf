output "id" {
  description = "Resource ID of the Application Gateway (passed to AKS AGIC addon)"
  value       = azurerm_application_gateway.this.id
}

output "public_ip_address" {
  description = "Public IP address of the Application Gateway frontend"
  value       = azurerm_public_ip.appgw.ip_address
}

output "public_ip_fqdn" {
  description = "FQDN of the Application Gateway public IP"
  value       = azurerm_public_ip.appgw.fqdn
}
