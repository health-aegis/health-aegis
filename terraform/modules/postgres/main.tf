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

  # VNet injection and public access are mutually exclusive.
  public_network_access_enabled = false

  storage_mb = 32768 # 32 GB — minimum for Flexible Server

  sku_name = "B_Standard_B1ms"

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  tags = var.tags

  # Azure auto-assigns an availability zone on creation; ignore it so Terraform
  # doesn't try to change it on subsequent applies.
  lifecycle {
    ignore_changes = [zone]
  }

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
  collation = "en_US.utf8"
}
