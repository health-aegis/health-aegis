variable "account_name" {
  description = "Name of the CosmosDB account (globally unique)"
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

variable "database_name" {
  description = "Name of the MongoDB database to create inside the account"
  type        = string
  default     = "aegis_db"
}

variable "pe_subnet_id" {
  description = "Resource ID of the private endpoint subnet"
  type        = string
}

variable "vnet_id" {
  description = "Resource ID of the VNet for private DNS zone VNet link"
  type        = string
}

variable "tags" {
  description = "Tags to apply to CosmosDB resources"
  type        = map(string)
  default     = {}
}
