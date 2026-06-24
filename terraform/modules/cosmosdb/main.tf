resource "azurerm_cosmosdb_account" "this" {
  name                          = var.account_name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  offer_type                    = "Standard"
  kind                          = "MongoDB"
  public_network_access_enabled = true

  # Enable MongoDB 4.x wire protocol features
  mongo_server_version = "4.2"

  consistency_policy {
    consistency_level = "Session"
  }

  # Single-region deployment
  geo_location {
    location          = var.location
    failover_priority = 0
  }

  # automatic_failover_enabled replaces deprecated enable_automatic_failover in azurerm ~> 3.50+
  automatic_failover_enabled        = false
  is_virtual_network_filter_enabled = false

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_cosmosdb_mongo_database" "this" {
  name                = var.database_name
  resource_group_name = var.resource_group_name
  account_name        = azurerm_cosmosdb_account.this.name

  autoscale_settings {
    max_throughput = 1000
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_private_endpoint" "cosmosdb" {
  name                = "${var.account_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id

  private_service_connection {
    name                           = "${var.account_name}-psc"
    private_connection_resource_id = azurerm_cosmosdb_account.this.id
    subresource_names              = ["MongoDB"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "cosmosdb-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.cosmosdb.id]
  }

  tags = var.tags
}

resource "azurerm_private_dns_zone" "cosmosdb" {
  name                = "privatelink.mongo.cosmos.azure.com"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "cosmosdb" {
  name                  = "${var.account_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.cosmosdb.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}
