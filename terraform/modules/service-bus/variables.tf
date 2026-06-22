variable "namespace_name" {
  description = "Name of the Azure Service Bus namespace"
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

variable "tags" {
  description = "Tags to apply to Service Bus resources"
  type        = map(string)
  default     = {}
}
