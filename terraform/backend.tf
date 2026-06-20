# ---------------------------------------------------------------------------
# Remote state backend — Azure Blob Storage
#
# The state file is stored in the same storage account used by the
# terraform-state-locking submodule. This keeps all Terraform state in one
# place while separating the infrastructure code from the state locking setup.
#
# To initialise: terraform init
#   (no -backend-config needed; all values are hardcoded here for simplicity)
#
# State file: aegis-private.tfstate
#   Separate from any other environments (e.g. aegis-staging.tfstate) to
#   prevent accidental cross-environment applies.
#
# NOTE: The storage account and container must exist BEFORE running terraform init.
# Bootstrap them with the terraform-state-locking module or create manually:
#   az storage account create -n aegishealthstorage -g aswin-rg --sku Standard_LRS
#   az storage container create -n tfstate --account-name aegishealthstorage
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Partial backend config — the `key` (state file name) is supplied per-environment
# via -backend-config so each environment has its own isolated state file.
#
# Init commands:
#   terraform init -backend-config=environments/test/backend.hcl
#   terraform init -backend-config=environments/prod/backend.hcl
#
# NOTE: Switching environments requires:
#   terraform init -backend-config=environments/<env>/backend.hcl -reconfigure
# ---------------------------------------------------------------------------
terraform {
  backend "azurerm" {
    resource_group_name  = "aswin-rg"
    storage_account_name = "aegishealthstorage"
    container_name       = "tfstate"
    # key is NOT set here — provided per-environment via -backend-config
  }
}
