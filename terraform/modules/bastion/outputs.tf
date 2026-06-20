output "bastion_name" {
  description = "Name of the Azure Bastion host"
  value       = azurerm_bastion_host.this.name
}

output "bastion_public_ip" {
  description = "Public IP address of the Azure Bastion host"
  value       = azurerm_public_ip.bastion.ip_address
}

output "bastion_id" {
  description = "Resource ID of the Azure Bastion host"
  value       = azurerm_bastion_host.this.id
}
