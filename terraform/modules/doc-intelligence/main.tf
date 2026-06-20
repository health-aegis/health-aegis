# ---------------------------------------------------------------------------
# Document Intelligence (Form Recognizer) module
#
# Azure Document Intelligence (formerly Form Recognizer) provides prebuilt
# and custom ML models for extracting structured data from medical documents,
# insurance forms, lab reports, and other healthcare paperwork.
#
# WHY kind="FormRecognizer":
#   "FormRecognizer" is the azurerm resource kind for Document Intelligence.
#   The service was renamed in Azure Portal but the API/resource kind is
#   still FormRecognizer in provider versions ~> 3.x.
#
# WHY S0 SKU:
#   F0 (free) is limited to 500 pages/month and doesn't support custom models.
#   S0 (Standard) is pay-per-use and supports all features. For production,
#   monitor usage and consider reserved capacity if volume is predictable.
#
# Private endpoint:
#   The "account" subresource connects the cognitive service to the pe-subnet.
# ---------------------------------------------------------------------------

resource "azurerm_cognitive_account" "this" {
  name                          = var.name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  kind                          = "FormRecognizer"
  sku_name                      = "S0"
  public_network_access_enabled = false

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Private endpoint — connects Document Intelligence to the pe-subnet
# ---------------------------------------------------------------------------
resource "azurerm_private_endpoint" "doc_intelligence" {
  name                = "${var.name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id

  private_service_connection {
    name                           = "${var.name}-psc"
    private_connection_resource_id = azurerm_cognitive_account.this.id
    subresource_names              = ["account"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "docai-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.doc_intelligence.id]
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Private DNS zone for Cognitive Services / Document Intelligence
# ---------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "doc_intelligence" {
  name                = "privatelink.cognitiveservices.azure.com"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "doc_intelligence" {
  name                  = "${var.name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.doc_intelligence.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}
