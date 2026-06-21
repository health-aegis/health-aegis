# ---------------------------------------------------------------------------
# AKS module — Private Kubernetes cluster
#
# PRIVATE CLUSTER ACCESS NOTE:
#   When private_cluster_enabled = true, the API server endpoint is only
#   reachable from within the VNet (or peered networks). To run kubectl
#   commands from outside the VNet, you have two options:
#     1. az aks command invoke -g <rg> -n <cluster> -- kubectl get pods
#     2. Connect via Azure Bastion to a jump box in the VNet, then kubectl.
#   CI/CD pipelines (GitHub Actions, Azure DevOps) must use self-hosted runners
#   inside the VNet, or use "az aks command invoke" with service principal auth.
#
# WHY kube_admin_config over kube_config:
#   kube_admin_config contains cluster-admin credentials (cert-based) that
#   bypass AAD RBAC. We use this in the kubernetes/helm providers because
#   AAD token-based auth (kube_config) requires an interactive az login during
#   plan/apply, which breaks automated pipelines.
#   kube_admin_config is only populated when azure_active_directory_role_based_access_control
#   has managed=true + azure_rbac_enabled=true.
#
# WHY OIDC + Workload Identity:
#   Enables pods to authenticate to Azure services (KeyVault, Storage, etc.)
#   using short-lived OIDC tokens bound to Kubernetes ServiceAccounts, instead
#   of storing long-lived secrets in the cluster. Zero credentials in Kubernetes.
#
# WHY key_vault_secrets_provider:
#   The Secrets Store CSI driver + Azure Key Vault provider automatically
#   syncs secrets from Key Vault into pod-mounted volumes and Kubernetes secrets,
#   with automatic rotation every 2 minutes.
# ---------------------------------------------------------------------------

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
  # All kubectl access must go through the VNet.
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

    # Auto-scaling: enable_auto_scaling is the correct name in azurerm 3.x.
    # It was renamed to auto_scaling_enabled in azurerm 4.0.
    enable_auto_scaling = true
    min_count           = var.node_count
    max_count           = var.node_count + 2
  }

  # SystemAssigned identity for the AKS control plane.
  # The kubelet gets its own separate user-assigned identity (exposed via
  # kubelet_identity output) which is used for ACR pull.
  identity {
    type = "SystemAssigned"
  }

  # OIDC issuer — prerequisite for Workload Identity federation.
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  # Secrets Store CSI driver with AKS-managed Azure Key Vault provider.
  # secret_rotation_enabled polls KV for changes and updates mounted secrets.
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # OMS agent sends container logs and metrics to Log Analytics.
  oms_agent {
    log_analytics_workspace_id = var.log_analytics_workspace_id
  }

  # Azure CNI: pods get VNet IPs (required for private endpoints to work from pods).
  # Azure network policy: enforces Kubernetes NetworkPolicy resources.
  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"
  }

  # Managed AAD integration with Azure RBAC lets you assign Kubernetes roles
  # to AAD users/groups/service principals without maintaining local RBAC.
  # Required to get kube_admin_config populated.
  azure_active_directory_role_based_access_control {
    managed            = true
    azure_rbac_enabled = true
  }

  # AGIC addon — Azure manages the AGIC controller inside the cluster.
  # It programs the Application Gateway based on Kubernetes Ingress resources.
  ingress_application_gateway {
    gateway_id = var.app_gateway_id
  }

  tags = var.tags
}

# ---------------------------------------------------------------------------
# AGIC role assignments
#
# The AGIC addon creates its own managed identity. AKS does NOT automatically
# grant it access to the Application Gateway — that causes the crash-loop you
# see immediately after cluster creation. These two assignments fix it:
#
#   Reader on the resource group   — lets AGIC list resources in the RG
#   Contributor on the App Gateway — lets AGIC read and update routing rules
#
# Without these, AGIC restarts every ~30 s with ErrorApplicationGatewayForbidden.
# ---------------------------------------------------------------------------
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
# Taints on the system pool (CriticalAddonsOnly) ensure user workloads land here.
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
}
