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

# purge_soft_delete_on_destroy=true: ensures Key Vault soft-deleted items are purged on destroy
# so the vault name can be reused immediately without waiting out the retention period.
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

# Kubernetes and Helm providers use kube_admin_config (cert-based, works non-interactively in CI).
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
