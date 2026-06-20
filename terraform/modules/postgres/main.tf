# ---------------------------------------------------------------------------
# PostgreSQL Flexible Server module — VNet-injected managed PostgreSQL
#
# WHY Flexible Server over Single Server:
#   Single Server is retired. Flexible Server is the current offering with
#   better performance, more configuration options, and VNet integration
#   (delegated subnet injection) instead of service endpoints.
#
# VNet injection (delegated subnet):
#   PostgreSQL Flexible Server is injected into a DEDICATED subnet that has
#   delegation to Microsoft.DBforPostgreSQL/flexibleServers. No other resource
#   types can be placed in this subnet. This is fundamentally different from
#   private endpoints — the server itself gets an IP in the subnet.
#
# IMPORTANT — DNS ordering:
#   The private DNS zone VNet link MUST exist before the flexible server is
#   created. If the server is created first, it cannot resolve its own FQDN
#   and provisioning fails. The depends_on block below enforces this.
#
# FQDN format: <server_name>.postgres.database.azure.com
# Connection string uses port 5432 with SSL required by default.
# ---------------------------------------------------------------------------

resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "${var.server_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                   = var.server_name
  resource_group_name    = var.resource_group_name
  location               = var.location
  version                = "15"
  administrator_login    = "pgadmin"
  administrator_password = var.postgres_password

  # VNet injection — server is placed directly in the postgres-subnet.
  # The subnet must be delegated to Microsoft.DBforPostgreSQL/flexibleServers.
  delegated_subnet_id = var.postgres_subnet_id
  private_dns_zone_id = azurerm_private_dns_zone.postgres.id

  storage_mb = 32768 # 32 GB — minimum for Flexible Server

  # B_Standard_B1ms: cheapest burstable SKU, suitable for dev/demo.
  # Production: use General Purpose (D-series) or Memory Optimized (E-series).
  sku_name = "B_Standard_B1ms"

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  # High availability disabled for cost in dev. Enable for production:
  # high_availability { mode = "ZoneRedundant" }

  tags = var.tags

  # Flexible server requires the private DNS zone VNet link to exist first
  # so it can register its FQDN during provisioning.
  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.postgres,
  ]
}

resource "azurerm_postgresql_flexible_server_database" "this" {
  name      = var.db_name
  server_id = azurerm_postgresql_flexible_server.this.id
  charset   = "UTF8"

  # en_US.utf8 is the standard collation for new databases.
  # Must be compatible with the charset (UTF8 → en_US.utf8 or C).
  collation = "en_US.utf8"
}
