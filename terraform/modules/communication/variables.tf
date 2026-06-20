variable "communication_service_name" {
  description = "Name of the Azure Communication Service resource"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "tags" {
  description = "Tags to apply to communication resources"
  type        = map(string)
  default     = {}
}
