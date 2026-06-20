variable "name" {
  description = "Name of the Document Intelligence (Form Recognizer) resource"
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

variable "pe_subnet_id" {
  description = "Resource ID of the private endpoint subnet"
  type        = string
}

variable "vnet_id" {
  description = "Resource ID of the VNet for private DNS zone VNet link"
  type        = string
}

variable "tags" {
  description = "Tags to apply to Document Intelligence resources"
  type        = map(string)
  default     = {}
}
