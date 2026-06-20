variable "resource_group_name" {
  description = "Name of the resource group in which to create network resources"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "vnet_name" {
  description = "Name of the virtual network"
  type        = string
}

variable "address_space" {
  description = "Address space for the VNet (single CIDR block)"
  type        = string
}

variable "subnets" {
  description = <<-EOT
    Map of subnets to create. Each key is the subnet name; value is an object with:
      cidr               - (string, required) CIDR block for the subnet
      disable_pe_policies - (bool, optional) set true on pe-subnet to disable
                            private_endpoint_network_policies (Azure requirement)
      delegation         - (object, optional) subnet delegation block with fields:
                            name, service_name, actions
  EOT
  type = map(object({
    cidr                = string
    disable_pe_policies = optional(bool, false)
    delegation = optional(object({
      name         = string
      service_name = string
      actions      = list(string)
    }), null)
  }))
}

variable "tags" {
  description = "Tags to apply to network resources"
  type        = map(string)
  default     = {}
}
