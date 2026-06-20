output "account_name" {
  description = "Name of the CosmosDB account"
  value       = azurerm_cosmosdb_account.this.name
}

output "id" {
  description = "Resource ID of the CosmosDB account"
  value       = azurerm_cosmosdb_account.this.id
}

output "mongodb_connection_string" {
  description = "Primary MongoDB connection string for the CosmosDB account"
  value       = azurerm_cosmosdb_account.this.primary_mongodb_connection_string
  sensitive   = true
}

output "database_name" {
  description = "Name of the MongoDB database"
  value       = azurerm_cosmosdb_mongo_database.this.name
}
