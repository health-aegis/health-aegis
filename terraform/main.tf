data "azurerm_client_config" "current" {}

locals {
  prefix = "${var.workload_name}-${var.environment}"

  common_tags = {
    Environment = var.environment
    Owner       = var.owner
    workload    = var.workload_name
    managed_by  = "terraform"
  }

  # Custom node resource group name — predictable for policy targeting.
  node_resource_group = "rg-${local.prefix}-nodes"

  # Derive storage account name from prefix (must be lowercase alphanumeric ≤24 chars)
  storage_account_name = lower(replace(var.storage_account_name_prefix, "-", ""))

  communication_service_name = var.communication_service_name != "" ? var.communication_service_name : "${local.prefix}-comm"

  deployer_object_id = var.deployer_object_id != "" ? var.deployer_object_id : data.azurerm_client_config.current.object_id
}

module "resource_group" {
  source   = "./modules/resource-group"
  name     = var.resource_group_name
  location = var.location
  tags     = local.common_tags
}

module "networking" {
  source              = "./modules/networking"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  vnet_name           = "${local.prefix}-vnet"
  address_space       = var.vnet_address_space
  tags                = local.common_tags

  subnets = {
    "public-subnet" = {
      cidr = var.public_subnet_cidr
    }
    "aks-subnet" = {
      cidr = var.aks_subnet_cidr
    }
    "pe-subnet" = {
      cidr                = var.pe_subnet_cidr
      disable_pe_policies = true # Required for private endpoints
    }
    "postgres-subnet" = {
      cidr = var.postgres_subnet_cidr
      delegation = {
        name         = "postgres-delegation"
        service_name = "Microsoft.DBforPostgreSQL/flexibleServers"
        actions      = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
      }
    }
    # AzureBastionSubnet: MUST use this exact name — Azure Bastion requirement.
    "AzureBastionSubnet" = {
      cidr = var.bastion_subnet_cidr
    }
  }
}

module "monitoring" {
  source              = "./modules/monitoring"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  workspace_name      = "${local.prefix}-law"
  app_insights_name   = "${local.prefix}-appinsights"
  tags                = local.common_tags
}

module "app_gateway" {
  source              = "./modules/app-gateway"
  name                = "${local.prefix}-appgw"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  subnet_id           = module.networking.subnet_ids["public-subnet"]
  enable_waf          = var.enable_waf
  tags                = local.common_tags
}

module "aks" {
  source                     = "./modules/aks"
  cluster_name               = "${local.prefix}-aks"
  resource_group_name        = module.resource_group.name
  resource_group_id          = module.resource_group.id
  location                   = module.resource_group.location
  node_resource_group        = local.node_resource_group
  kubernetes_version         = var.kubernetes_version
  node_count                 = var.node_count
  node_vm_size               = var.node_vm_size
  aks_subnet_id              = module.networking.subnet_ids["aks-subnet"]
  log_analytics_workspace_id = module.monitoring.workspace_id
  user_node_count            = var.user_node_count
  user_node_vm_size          = var.user_node_vm_size
  app_gateway_id             = module.app_gateway.id
  tags                       = local.common_tags

  depends_on = [module.app_gateway]
}

module "workload_identity" {
  source                          = "./modules/workload-identity"
  identity_name                   = "${local.prefix}-workload-identity"
  resource_group_name             = module.resource_group.name
  location                        = module.resource_group.location
  oidc_issuer_url                 = module.aks.oidc_issuer_url
  kubernetes_namespace            = var.kubernetes_namespace
  kubernetes_service_account_name = var.kubernetes_service_account_name
  tags                            = local.common_tags
}

# depends_on: kubelet_identity_object_id doesn't exist until the cluster is created.
module "acr" {
  source                     = "./modules/acr"
  acr_name                   = var.acr_name
  resource_group_name        = module.resource_group.name
  location                   = module.resource_group.location
  pe_subnet_id               = module.networking.subnet_ids["pe-subnet"]
  vnet_id                    = module.networking.vnet_id
  kubelet_identity_object_id = module.aks.kubelet_identity_object_id
  tags                       = local.common_tags

  depends_on = [module.aks]
}

module "bastion" {
  source              = "./modules/bastion"
  name                = local.prefix
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  bastion_subnet_id   = module.networking.subnet_ids["AzureBastionSubnet"]
  tags                = local.common_tags
}

module "postgres" {
  source              = "./modules/postgres"
  server_name         = "${local.prefix}-pgflex"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  postgres_subnet_id  = module.networking.subnet_ids["postgres-subnet"]
  vnet_id             = module.networking.vnet_id
  postgres_password   = var.postgres_admin_password
  db_name             = var.postgres_db_name
  tags                = local.common_tags
}

module "cosmosdb" {
  source              = "./modules/cosmosdb"
  account_name        = var.cosmosdb_account_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  database_name       = var.cosmosdb_database_name
  pe_subnet_id        = module.networking.subnet_ids["pe-subnet"]
  vnet_id             = module.networking.vnet_id
  tags                = local.common_tags
}

module "storage" {
  source              = "./modules/storage"
  account_name        = local.storage_account_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  container_names     = var.storage_container_names
  pe_subnet_id        = module.networking.subnet_ids["pe-subnet"]
  vnet_id             = module.networking.vnet_id
  tags                = local.common_tags
}

module "doc_intelligence" {
  source              = "./modules/doc-intelligence"
  name                = var.doc_intelligence_name
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  pe_subnet_id        = module.networking.subnet_ids["pe-subnet"]
  vnet_id             = module.networking.vnet_id
  tags                = local.common_tags
}

module "communication" {
  source                     = "./modules/communication"
  communication_service_name = local.communication_service_name
  resource_group_name        = module.resource_group.name
  tags                       = local.common_tags
}

module "service_bus" {
  source              = "./modules/service-bus"
  namespace_name      = "${local.prefix}-bus"
  resource_group_name = module.resource_group.name
  location            = module.resource_group.location
  tags                = local.common_tags
}

# Key Vault is created last — it stores secrets from all other modules.
# Explicit depends_on ensures secret values are available before Key Vault writes them.
module "key_vault" {
  source                         = "./modules/key-vault"
  key_vault_name                 = var.key_vault_name
  resource_group_name            = module.resource_group.name
  location                       = module.resource_group.location
  pe_subnet_id                   = module.networking.subnet_ids["pe-subnet"]
  vnet_id                        = module.networking.vnet_id
  deployer_object_id             = local.deployer_object_id
  deployer_ip                    = var.deployer_ip
  workload_identity_principal_id = module.workload_identity.principal_id
  purge_protection_enabled       = var.key_vault_purge_protection
  soft_delete_retention_days     = var.key_vault_retention_days
  tags                           = local.common_tags

  secrets = {
    "kv-mongodb-uri"        = module.cosmosdb.mongodb_connection_string
    "kv-jwt-secret"         = var.jwt_secret
    "kv-postgres-url"       = module.postgres.connection_string
    "kv-postgres-password"  = var.postgres_admin_password
    "kv-azure-storage-conn" = module.storage.primary_connection_string
    "kv-gemini-api-key"     = var.gemini_api_key
    "kv-azure-ai-endpoint"  = var.azure_ai_endpoint
    "kv-azure-ai-key"       = var.azure_ai_key
    "kv-appinsights-conn"   = module.monitoring.app_insights_connection_string
    "kv-docai-endpoint"     = module.doc_intelligence.endpoint
    "kv-docai-key"          = module.doc_intelligence.primary_key
    "kv-comm-conn-string"   = module.communication.primary_connection_string
    "kv-servicebus-conn"    = module.service_bus.primary_connection_string
  }

  depends_on = [
    module.cosmosdb,
    module.storage,
    module.postgres,
    module.monitoring,
    module.workload_identity,
    module.doc_intelligence,
    module.communication,
    module.service_bus,
  ]
}

module "function_app" {
  source = "./modules/function-app"

  function_app_name         = "${local.prefix}-func"
  resource_group_name       = module.resource_group.name
  location                  = module.resource_group.location
  func_storage_account_name = "${lower(replace(var.storage_account_name_prefix, "-", ""))}fn"
  service_plan_name         = "${local.prefix}-func-plan"
  key_vault_id              = module.key_vault.id
  key_vault_name            = var.key_vault_name
  tenant_id                 = data.azurerm_client_config.current.tenant_id
  acs_sender_address        = "DoNotReply@${module.communication.mail_from_sender_domain}"
  app_base_url              = var.app_base_url
  tags                      = local.common_tags

  depends_on = [module.key_vault]
}

# Grant the pod identity Storage Blob Data Contributor on the storage account
# so pods can read/write blobs using DefaultAzureCredential (OIDC token).
resource "azurerm_role_assignment" "workload_identity_storage" {
  scope                = module.storage.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.workload_identity.principal_id
}
