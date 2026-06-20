output "cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.this.name
}

output "cluster_id" {
  description = "Resource ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.this.id
}

output "oidc_issuer_url" {
  description = "OIDC issuer URL — used as the issuer when creating federated identity credentials"
  value       = azurerm_kubernetes_cluster.this.oidc_issuer_url
}

# kube_admin_config: cert-based cluster-admin credentials.
# Use these in the kubernetes/helm Terraform providers so plan/apply works
# in non-interactive CI without requiring az login + token refresh.
# SECURITY: These are cluster-admin credentials — store the raw config
# securely (e.g. in Key Vault) and never commit it to source control.
output "kube_admin_config" {
  description = "Cluster admin kubeconfig attributes (cert-based, bypasses AAD)"
  value       = azurerm_kubernetes_cluster.this.kube_admin_config[0]
  sensitive   = true
}

output "kube_config_raw" {
  description = "Raw kubeconfig string for the cluster admin"
  value       = azurerm_kubernetes_cluster.this.kube_admin_config_raw
  sensitive   = true
}

output "node_resource_group" {
  description = "Name of the managed (node) resource group created by AKS"
  value       = azurerm_kubernetes_cluster.this.node_resource_group
}

output "kubelet_identity_object_id" {
  description = <<-EOT
    Object ID of the kubelet managed identity.
    Grant this identity AcrPull on ACR so AKS nodes can pull images without
    an image pull secret.
  EOT
  value       = azurerm_kubernetes_cluster.this.kubelet_identity[0].object_id
}

output "kubelet_identity_client_id" {
  description = "Client ID of the kubelet managed identity"
  value       = azurerm_kubernetes_cluster.this.kubelet_identity[0].client_id
}
