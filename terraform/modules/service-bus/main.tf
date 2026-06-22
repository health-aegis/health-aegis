# ---------------------------------------------------------------------------
# Azure Service Bus module — async messaging for notification pipeline
#
# Architecture:
#   Service Bus Namespace (Standard)
#     └── Queue: "notifications"
#           ├── Authorization rule: "notification-worker" (Listen + Send)
#           └── Messages published by: api-gateway (missed-dose alerts)
#               Messages consumed by:  notification-worker (email dispatch)
#
# WHY Standard tier:
#   Basic only supports queues with limited features and no dead-lettering.
#   Standard adds dead-letter queues, message sessions, and duplicate detection
#   which are important for reliable notification delivery in healthcare.
#
# WHY a dedicated queue for notifications:
#   Decouples the api-gateway from the email-sending path. If the email
#   provider is slow or down, messages queue up and are retried without
#   blocking the API response to the user.
# ---------------------------------------------------------------------------

resource "azurerm_servicebus_namespace" "this" {
  name                = var.namespace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
  tags                = var.tags
}

resource "azurerm_servicebus_queue" "notifications" {
  name         = "notifications"
  namespace_id = azurerm_servicebus_namespace.this.id

  # Keep unprocessed messages for 7 days before moving to dead-letter queue
  max_delivery_count                   = 5
  lock_duration                        = "PT1M"
  default_message_time_to_live         = "P7D"
  dead_lettering_on_message_expiration = true
  enable_partitioning                  = false
}

resource "azurerm_servicebus_namespace_authorization_rule" "notification_worker" {
  name         = "notification-worker"
  namespace_id = azurerm_servicebus_namespace.this.id

  listen = true
  send   = true
  manage = false
}
