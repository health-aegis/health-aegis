variable "name" {
  description = "Name of the Application Gateway"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group to deploy into"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "subnet_id" {
  description = "Resource ID of the public subnet for the Application Gateway"
  type        = string
}

variable "enable_waf" {
  description = "When true, deploys WAF_v2 SKU with OWASP 3.2 rules in Prevention mode instead of Standard_v2"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Tags to apply to all resources"
  type        = map(string)
  default     = {}
}
