variable "account_name" {
  description = "Name of the storage account (globally unique, 3-24 lowercase alphanumeric)"
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

variable "container_names" {
  description = "List of blob container names to create (e.g. ['health-records', 'medical-images'])"
  type        = list(string)
  default     = ["health-records", "medical-images", "uploads", "exports"]
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
  description = "Tags to apply to storage resources"
  type        = map(string)
  default     = {}
}
