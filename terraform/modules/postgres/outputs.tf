output "server_name" {
  description = "Name of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.this.name
}

output "fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server"
  value       = azurerm_postgresql_flexible_server.this.fqdn
}

output "connection_string" {
  description = "PostgreSQL connection string (postgresql://pgadmin:<password>@<fqdn>:5432/<db>)"
  value       = "postgresql://pgadmin:${var.postgres_password}@${azurerm_postgresql_flexible_server.this.fqdn}:5432/${var.db_name}?sslmode=require"
  sensitive   = true
}

output "database_name" {
  description = "Name of the database created on the server"
  value       = azurerm_postgresql_flexible_server_database.this.name
}
