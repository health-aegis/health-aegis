resource "azurerm_servicebus_namespace" "this" {
  name                = var.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
  tags                = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

resource "azurerm_servicebus_queue" "notifications" {
  name         = "notifications"
  namespace_id = azurerm_servicebus_namespace.this.id

  # Keep unprocessed messages for 7 days before moving to dead-letter queue
  max_delivery_count                   = 5
  lock_duration                        = "PT1M"
  default_message_ttl                  = "P7D"
  dead_lettering_on_message_expiration = true
  partitioning_enabled                 = false
}

resource "azurerm_servicebus_namespace_authorization_rule" "notification_worker" {
  name         = "notification-worker"
  namespace_id = azurerm_servicebus_namespace.this.id

  listen = true
  send   = true
  manage = false
}
