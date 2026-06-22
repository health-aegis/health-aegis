output "primary_connection_string" {
  description = "Primary connection string for the notification-worker authorization rule (Listen + Send)"
  value       = azurerm_servicebus_namespace_authorization_rule.notification_worker.primary_connection_string
  sensitive   = true
}

output "namespace_name" {
  description = "Name of the Service Bus namespace"
  value       = azurerm_servicebus_namespace.this.name
}

output "queue_name" {
  description = "Name of the notifications queue"
  value       = azurerm_servicebus_queue.notifications.name
}
