terraform {
  backend "azurerm" {
    resource_group_name  = "aswin-rg"
    storage_account_name = "aegishealthstorage"
    container_name       = "tfstate"
    # key is NOT set here — provided per-environment via -backend-config
  }
}
