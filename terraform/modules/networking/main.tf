# ---------------------------------------------------------------------------
# Networking module — creates the VNet and all subnets for the Aegis platform.
#
# Subnet notes:
#   - aks-subnet:         Azure CNI node/pod subnet; no service endpoint needed
#                         since all dependencies use private endpoints.
#   - pe-subnet:          Hosts all Private Endpoints. Network policies are
#                         DISABLED so the NSG/route-table on the subnet doesn't
#                         block private endpoint traffic (Azure requirement).
#   - postgres-subnet:    VNet-injected PostgreSQL Flexible Server. The subnet
#                         must be delegated to Microsoft.DBforPostgreSQL/flexibleServers
#                         and cannot contain any other resource types.
#   - AzureBastionSubnet: MUST use this exact name — Azure Bastion rejects any
#                         other name. Min /27 but we use /26 for headroom.
# ---------------------------------------------------------------------------

resource "azurerm_virtual_network" "this" {
  name                = var.vnet_name
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = [var.address_space]
  tags                = var.tags
}

resource "azurerm_subnet" "subnets" {
  for_each = var.subnets

  name                 = each.key
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = [each.value.cidr]

  # Disable private endpoint network policies on the pe-subnet so Azure can
  # route traffic to private endpoints regardless of subnet NSG/UDR settings.
  # azurerm ~> 3.86+ uses string "Disabled"/"Enabled" (replaces the deprecated bool attribute).
  private_endpoint_network_policies = lookup(each.value, "disable_pe_policies", false) ? "Disabled" : "Enabled"

  dynamic "delegation" {
    for_each = lookup(each.value, "delegation", null) != null ? [each.value.delegation] : []
    content {
      name = delegation.value.name
      service_delegation {
        name    = delegation.value.service_name
        actions = delegation.value.actions
      }
    }
  }
}
