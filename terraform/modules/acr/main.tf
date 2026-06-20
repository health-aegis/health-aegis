# ---------------------------------------------------------------------------
# ACR module — Azure Container Registry (Premium SKU, fully private)
#
# WHY Premium: Premium is the only SKU that supports Private Endpoints.
# Standard/Basic do not allow disabling public network access, so all node
# pulls would go over the public internet — unacceptable for a private cluster.
#
# WHY admin_enabled=false: Admin credentials are shared long-lived secrets.
# Instead, AKS pulls images using the kubelet's managed identity (AcrPull role
# assignment below). This is the recommended, secretless approach.
#
# Private endpoint + DNS:
#   The private DNS zone "privatelink.azurecr.io" routes *.azurecr.io lookups
#   from inside the VNet to the private IP, so AKS nodes resolve the registry
#   to a private address without any custom DNS configuration.
# ---------------------------------------------------------------------------

resource "azurerm_container_registry" "this" {
  name                          = var.acr_name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  sku                           = "Premium"
  admin_enabled                 = false
  public_network_access_enabled = false

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Private endpoint — connects ACR to the pe-subnet
# ---------------------------------------------------------------------------
resource "azurerm_private_endpoint" "acr" {
  name                = "${var.acr_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id

  private_service_connection {
    name                           = "${var.acr_name}-psc"
    private_connection_resource_id = azurerm_container_registry.this.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "acr-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.acr.id]
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Private DNS zone for ACR
# ---------------------------------------------------------------------------
resource "azurerm_private_dns_zone" "acr" {
  name                = "privatelink.azurecr.io"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "acr" {
  name                  = "${var.acr_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.acr.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}

# ---------------------------------------------------------------------------
# AcrPull role assignment for AKS kubelet identity
#
# WHY kubelet identity (not control plane identity): The kubelet is the
# component that actually pulls images. Granting AcrPull to the control plane
# identity would have no effect on image pulls. The kubelet_identity_object_id
# is passed in from the AKS module output after the cluster is created.
# ---------------------------------------------------------------------------
resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.this.id
  role_definition_name = "AcrPull"
  principal_id         = var.kubelet_identity_object_id
}
