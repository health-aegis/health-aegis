# ---------------------------------------------------------------------------
# Storage module — Azure Blob Storage for medical images and health records
#
# WHY LRS (Locally Redundant Storage):
#   For a dev environment, LRS is the most cost-effective option. Production
#   should use ZRS (zone-redundant) or GRS (geo-redundant) depending on
#   the RPO/RTO requirements for medical image data.
#
# WHY min_tls_version = TLS1_2:
#   Enforces TLS 1.2 minimum — TLS 1.0/1.1 are deprecated and insecure.
#   Required for healthcare compliance (HIPAA, ISO 27001).
#
# Private endpoint: only the "blob" subresource is needed for storing
# DICOM images, health records, and uploads. If Table/Queue/File storage
# is needed later, add separate private endpoints for those subresources.
# ---------------------------------------------------------------------------

resource "azurerm_storage_account" "this" {
  name                     = var.account_name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  # Public access left enabled so the Terraform runner (GitHub Actions) can manage
  # containers. Container-level access is private (container_access_type = "private").
  # The private endpoint handles in-cluster pod access.

  # Require HTTPS for all requests
  # azurerm ~> 3.86+ uses https_traffic_only_enabled (replaces deprecated enable_https_traffic_only)
  https_traffic_only_enabled = true

  # Enable soft delete for blobs (7-day recovery window)
  blob_properties {
    delete_retention_policy {
      days = 7
    }
    container_delete_retention_policy {
      days = 7
    }
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Blob containers
# ---------------------------------------------------------------------------
resource "azurerm_storage_container" "containers" {
  for_each = toset(var.container_names)

  name                  = each.value
  storage_account_name  = azurerm_storage_account.this.name
  container_access_type = "private"
}

# ---------------------------------------------------------------------------
# Private endpoint — connects Storage to the pe-subnet
# ---------------------------------------------------------------------------
resource "azurerm_private_endpoint" "storage" {
  name                = "${var.account_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id

  private_service_connection {
    name                           = "${var.account_name}-psc"
    private_connection_resource_id = azurerm_storage_account.this.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "storage-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.storage.id]
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Private DNS zone for Azure Blob Storage
# ---------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "storage" {
  name                = "privatelink.blob.core.windows.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "storage" {
  name                  = "${var.account_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.storage.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}
