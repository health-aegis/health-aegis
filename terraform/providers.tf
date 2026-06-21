terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 2.53"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.14"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.31"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# -----------------------------------------------------------------------
# AzureRM provider — main provider for all Azure resources
# purge_soft_delete_on_destroy=true: ensures Key Vault soft-deleted items
# are purged when Terraform destroys them, so the vault name can be reused
# immediately (otherwise the name is reserved for soft_delete_retention_days).
# ---------------------------------------------------------------------------
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

provider "azuread" {}

provider "random" {}

# ---------------------------------------------------------------------------
# Kubernetes and Helm providers use kube_admin_config (cert-based credentials).
#
# WHY kube_admin_config and NOT kube_config:
#   kube_config contains AAD-integrated credentials that require an interactive
#   az login + token refresh. In CI pipelines this breaks because there is no
#   browser available. kube_admin_config provides static certificate-based
#   cluster-admin credentials that work non-interactively.
#
#   kube_admin_config is only populated when:
#     azure_active_directory_role_based_access_control {
#       managed            = true
#       azure_rbac_enabled = true
#     }
#   is configured on the cluster (which we do in the aks module).
#
# IMPORTANT: These providers create a dependency on the AKS module.
# Terraform resolves this automatically through the module output reference.
# ---------------------------------------------------------------------------
provider "kubernetes" {
  host = module.aks.kube_admin_config.host

  client_certificate     = base64decode(module.aks.kube_admin_config.client_certificate)
  client_key             = base64decode(module.aks.kube_admin_config.client_key)
  cluster_ca_certificate = base64decode(module.aks.kube_admin_config.cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host = module.aks.kube_admin_config.host

    client_certificate     = base64decode(module.aks.kube_admin_config.client_certificate)
    client_key             = base64decode(module.aks.kube_admin_config.client_key)
    cluster_ca_certificate = base64decode(module.aks.kube_admin_config.cluster_ca_certificate)
  }
}
