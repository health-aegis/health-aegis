variable "identity_name" {
  description = "Name of the user-assigned managed identity"
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

variable "oidc_issuer_url" {
  description = "OIDC issuer URL from the AKS cluster (module.aks.oidc_issuer_url)"
  type        = string
}

variable "kubernetes_namespace" {
  description = "Kubernetes namespace containing the ServiceAccount to federate"
  type        = string
  default     = "aegis"
}

variable "kubernetes_service_account_name" {
  description = "Name of the Kubernetes ServiceAccount to federate with this identity"
  type        = string
  default     = "aegis-workload-sa"
}

variable "tags" {
  description = "Tags to apply to workload identity resources"
  type        = map(string)
  default     = {}
}
