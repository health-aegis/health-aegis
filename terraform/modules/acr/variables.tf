variable "acr_name" {
  description = "Name of the Azure Container Registry (globally unique, alphanumeric only)"
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

variable "kubelet_identity_object_id" {
  description = <<-EOT
    Object ID of the AKS kubelet managed identity.
    This identity is granted AcrPull on the registry so AKS nodes can pull
    images without any image pull secret or stored credentials.
  EOT
  type        = string
}

variable "tags" {
  description = "Tags to apply to ACR resources"
  type        = map(string)
  default     = {}
}
