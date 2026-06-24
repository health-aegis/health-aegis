data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "this" {
  name                       = var.key_vault_name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.purge_protection_enabled

  public_network_access_enabled = true

  # Allow all networks — secrets are protected by access policies, not network rules.
  # GHA runners have dynamic IPs so IP allowlisting is not practical.
  network_acls {
    bypass         = "AzureServices"
    default_action = "Allow"
  }

  tags = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

# Terraform deployer (human or service principal running TF)
resource "azurerm_key_vault_access_policy" "deployer" {
  key_vault_id = azurerm_key_vault.this.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.deployer_object_id

  secret_permissions = [
    "Backup", "Delete", "Get", "List", "Purge", "Recover", "Restore", "Set"
  ]

  key_permissions = [
    "Backup", "Create", "Decrypt", "Delete", "Encrypt", "Get", "Import",
    "List", "Purge", "Recover", "Restore", "Sign", "UnwrapKey", "Update",
    "Verify", "WrapKey"
  ]

  certificate_permissions = [
    "Backup", "Create", "Delete", "DeleteIssuers", "Get", "GetIssuers",
    "Import", "List", "ListIssuers", "ManageContacts", "ManageIssuers",
    "Purge", "Recover", "Restore", "SetIssuers", "Update"
  ]
}

# Workload identity — pods can Get/List secrets from Key Vault
resource "azurerm_key_vault_access_policy" "workload_identity" {
  key_vault_id = azurerm_key_vault.this.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = var.workload_identity_principal_id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_secret" "secrets" {
  # Use nonsensitive() on keys ONLY — keys appear in plan output as resource
  # addresses and cannot be sensitive. Values come from the original sensitive
  # map so they are never exposed in logs or state file plaintext.
  for_each = toset(keys(nonsensitive(var.secrets)))

  name         = each.key
  value        = var.secrets[each.key]
  key_vault_id = azurerm_key_vault.this.id

  depends_on = [
    azurerm_key_vault_access_policy.deployer,
  ]

  tags = var.tags
}

resource "azurerm_private_endpoint" "kv" {
  name                = "${var.key_vault_name}-pe"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.pe_subnet_id

  private_service_connection {
    name                           = "${var.key_vault_name}-psc"
    private_connection_resource_id = azurerm_key_vault.this.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "kv-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.kv.id]
  }

  tags = var.tags
}

resource "azurerm_private_dns_zone" "kv" {
  name                = "privatelink.vaultcore.azure.net"
  resource_group_name = var.resource_group_name
  tags                = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "kv" {
  name                  = "${var.key_vault_name}-dns-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.kv.name
  virtual_network_id    = var.vnet_id
  registration_enabled  = false
  tags                  = var.tags
}
