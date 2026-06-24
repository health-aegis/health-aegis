resource "azurerm_communication_service" "this" {
  name                = var.communication_service_name
  resource_group_name = var.resource_group_name
  data_location       = "India"
  tags                = var.tags
}

resource "azurerm_email_communication_service" "this" {
  name                = "${var.communication_service_name}-email"
  resource_group_name = var.resource_group_name
  data_location       = "India"
  tags                = var.tags
}

resource "azurerm_email_communication_service_domain" "this" {
  name             = "AzureManagedDomain"
  email_service_id = azurerm_email_communication_service.this.id

  # AzureManaged: Azure provisions and verifies the domain automatically.
  # No DNS changes needed. Sender address: DoNotReply@<guid>.azurecomm.net
  domain_management = "AzureManaged"
  tags              = var.tags
}

# azurerm_communication_service_email_domain_association is the correct
# resource name in azurerm 3.x.
resource "azurerm_communication_service_email_domain_association" "this" {
  communication_service_id = azurerm_communication_service.this.id
  email_service_domain_id  = azurerm_email_communication_service_domain.this.id
}
