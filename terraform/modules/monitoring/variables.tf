variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "workspace_name" {
  description = "Name of the Log Analytics workspace"
  type        = string
}

variable "app_insights_name" {
  description = "Name of the Application Insights resource"
  type        = string
}

variable "tags" {
  description = "Tags to apply to monitoring resources"
  type        = map(string)
  default     = {}
}
