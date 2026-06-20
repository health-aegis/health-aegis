variable "server_name" {
  description = "Name of the PostgreSQL Flexible Server (globally unique)"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "postgres_subnet_id" {
  description = <<-EOT
    Resource ID of the subnet delegated to Microsoft.DBforPostgreSQL/flexibleServers.
    This subnet must NOT contain any other resource types — it is exclusively
    used for VNet injection of the PostgreSQL Flexible Server.
  EOT
  type        = string
}

variable "vnet_id" {
  description = "Resource ID of the VNet for private DNS zone VNet link"
  type        = string
}

variable "postgres_password" {
  description = "Administrator password for the PostgreSQL server"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Name of the database to create on the PostgreSQL server"
  type        = string
  default     = "aegis_imaging"
}

variable "tags" {
  description = "Tags to apply to PostgreSQL resources"
  type        = map(string)
  default     = {}
}
