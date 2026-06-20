variable "name" {
  description = "Base name prefix for bastion resources (e.g. 'aegis-dev')"
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

variable "bastion_subnet_id" {
  description = <<-EOT
    Resource ID of the AzureBastionSubnet.
    The subnet name MUST be exactly "AzureBastionSubnet" — Azure Bastion
    will refuse to deploy to a subnet with any other name.
  EOT
  type        = string
}

variable "tags" {
  description = "Tags to apply to bastion resources"
  type        = map(string)
  default     = {}
}
