variable "cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group in which to create the cluster"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "node_resource_group" {
  description = <<-EOT
    Name for the managed (node) resource group where AKS places VMs, disks,
    NICs, etc. Defaults to MC_<rg>_<cluster>_<region> if not specified here.
    We override it for predictability and policy targeting.
  EOT
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version to deploy (e.g. '1.29')"
  type        = string
}

variable "node_count" {
  description = "Initial and minimum node count for the default node pool"
  type        = number
  default     = 1
}

variable "node_vm_size" {
  description = "VM size for default node pool nodes (e.g. Standard_D2s_v3)"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "aks_subnet_id" {
  description = "Resource ID of the AKS subnet (Azure CNI assigns pod IPs from this range)"
  type        = string
}

variable "log_analytics_workspace_id" {
  description = "Resource ID of the Log Analytics workspace for OMS agent"
  type        = string
}

variable "user_node_count" {
  description = "Initial and minimum node count for the user node pool"
  type        = number
  default     = 1
}

variable "user_node_vm_size" {
  description = "VM size for the user node pool (can differ from system pool)"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "tags" {
  description = "Tags to apply to AKS resources"
  type        = map(string)
  default     = {}
}
