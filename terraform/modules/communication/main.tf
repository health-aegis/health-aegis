# ---------------------------------------------------------------------------
# Azure Communication Services module — email notification infrastructure
#
# Architecture:
#   Communication Service  →  Email Communication Service
#                                └── Email Domain (Azure Managed)
#                                      └── Domain Association
#
# WHY data_location="India":
#   For healthcare data sovereignty, communication data (email logs, call
#   records) is stored in the India geography, matching our Central India
#   deployment. This is required for compliance in many Indian healthcare
#   regulations.
#
# WHY AzureManaged domain:
#   Azure provides a verified "azurecomm.net" subdomain for development
#   without requiring DNS ownership proof. For production, switch to
#   "CustomerManaged" and configure SPF/DKIM on your own domain.
#
# USAGE:
#   Use the primary_connection_string output to configure the Notification
#   microservice. The email sender address will be:
#   DoNotReply@<domain_name>.azurecomm.net
# ---------------------------------------------------------------------------

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
# resource name in azurerm 3.x. The inverse ordering
# (azurerm_email_communication_service_domain_association) does not exist.
resource "azurerm_communication_service_email_domain_association" "this" {
  communication_service_id = azurerm_communication_service.this.id
  email_service_domain_id  = azurerm_email_communication_service_domain.this.id
}
