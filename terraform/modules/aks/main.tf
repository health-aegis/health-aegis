resource "azurerm_kubernetes_cluster" "this" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name

  # Custom node resource group name for predictability.
  # The default MC_* name is auto-generated and hard to reference in policies.
  node_resource_group = var.node_resource_group

  dns_prefix = var.cluster_name

  kubernetes_version = var.kubernetes_version

  # Private cluster — API server has no public endpoint.
  private_cluster_enabled             = true
  private_cluster_public_fqdn_enabled = false

  # System node pool — runs kube-system pods (CoreDNS, metrics-server, etc.)
  default_node_pool {
    name            = "system"
    node_count      = var.node_count
    vm_size         = var.node_vm_size
    vnet_subnet_id  = var.aks_subnet_id
    type            = "VirtualMachineScaleSets"
    os_disk_size_gb = 50

    # enable_auto_scaling was renamed to auto_scaling_enabled in azurerm 4.0
    enable_auto_scaling = true
    min_count           = var.node_count
    max_count           = var.node_count + 2
  }

  identity {
    type = "SystemAssigned"
  }

  # OIDC issuer — prerequisite for Workload Identity federation.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  # Secrets Store CSI driver with AKS-managed Azure Key Vault provider.
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # OMS agent sends container logs and metrics to Log Analytics.
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Azure CNI: pods get VNet IPs (required for private endpoints to work from pods).
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
  }

  # Managed AAD integration with Azure RBAC.
  # Required to get kube_admin_config populated.
  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  # AGIC addon — Azure manages the AGIC controller inside the cluster.
  ingress_application_gateway {
    gateway_id = var.app_gateway_id
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [default_node_pool[0].node_count]
  }
}

# AGIC role assignments — the AGIC addon creates its own managed identity.
# AKS does NOT automatically grant it access to the Application Gateway.
resource "azurerm_role_assignment" "agic_rg_reader" {
  scope                = var.resource_group_id
  role_definition_name = "Reader"
  principal_id         = azurerm_kubernetes_cluster.this.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
}

resource "azurerm_role_assignment" "agic_appgw_contributor" {
  scope                = var.app_gateway_id
  role_definition_name = "Contributor"
  principal_id         = azurerm_kubernetes_cluster.this.ingress_application_gateway[0].ingress_application_gateway_identity[0].object_id
}

# User node pool — runs application workloads (keeps kube-system isolated on system pool).
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.this.id
  vm_size               = var.user_node_vm_size
  vnet_subnet_id        = var.aks_subnet_id
  os_disk_size_gb       = 50
  mode                  = "User"

  enable_auto_scaling = true
  min_count           = var.user_node_count
  max_count           = var.user_node_count + 2
  node_count          = var.user_node_count

  node_labels = {
    "workload-type" = "user"
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}
