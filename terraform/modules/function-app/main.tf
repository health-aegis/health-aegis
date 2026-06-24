data "archive_file" "function_package" {
  type        = "zip"
  source_dir  = "${path.module}/function-code"
  output_path = "${path.root}/azure-function-deploy.zip"
  excludes    = ["node_modules", "local.settings.json", ".funcignore"]
}

# Internal storage — Functions runtime state, trigger coordination, deployment packages.
# Separate from the health-records storage account; no health data is stored here.
resource "azurerm_storage_account" "func" {
  name                       = var.func_storage_account_name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  account_tier               = "Standard"
  account_replication_type   = "LRS"
  min_tls_version            = "TLS1_2"
  https_traffic_only_enabled = true
  tags                       = var.tags
}

# Serverless Consumption plan — Linux Y1
resource "azurerm_service_plan" "this" {
  name                = var.service_plan_name
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "Y1"
  tags                = var.tags
}

resource "azurerm_linux_function_app" "this" {
  name                        = var.function_app_name
  resource_group_name         = var.resource_group_name
  location                    = var.location
  service_plan_id             = azurerm_service_plan.this.id
  storage_account_name        = azurerm_storage_account.func.name
  storage_account_access_key  = azurerm_storage_account.func.primary_access_key
  functions_extension_version = "~4"

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  # All sensitive values use Key Vault references — resolved at runtime by the
  # Functions host using the function app's system-assigned managed identity.
  app_settings = {
    # Blob trigger source (health-records/{userId}/{filename})
    "AZURE_STORAGE_CONNECTION_STRING" = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=kv-azure-storage-conn)"

    # Document Intelligence / Form Recognizer
    "FORM_RECOGNIZER_ENDPOINT" = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=kv-docai-endpoint)"
    "FORM_RECOGNIZER_KEY"      = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=kv-docai-key)"

    # CosmosDB (MongoDB API) — upsert extracted text into medicalrecords
    "COSMOS_MONGODB_URI" = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=kv-mongodb-uri)"

    # Azure Communication Services — email to patient
    "ACS_CONNECTION_STRING" = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=kv-comm-conn-string)"
    "ACS_SENDER_ADDRESS"    = var.acs_sender_address

    # Link in notification email pointing back to the web app
    "APP_BASE_URL" = var.app_base_url

    # Application Insights telemetry
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = "@Microsoft.KeyVault(VaultName=${var.key_vault_name};SecretName=kv-appinsights-conn)"

    # Remote build — Azure runs npm install server-side during zip deploy
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
    "ENABLE_ORYX_BUILD"              = "true"
  }

  # System-assigned identity — used for Key Vault reference resolution
  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}


# Deploy function code via zip deploy with remote build (npm install runs on Azure).
# Triggers re-deploy whenever function source files change (tracked by SHA256 hash).
resource "null_resource" "deploy_function_code" {
  triggers = {
    package_hash    = data.archive_file.function_package.output_sha256
    function_app_id = azurerm_linux_function_app.this.id
  }

  provisioner "local-exec" {
    on_failure = continue
    command    = <<-EOT
      az functionapp deployment source config-zip \
        --resource-group ${var.resource_group_name} \
        --name ${azurerm_linux_function_app.this.name} \
        --src ${data.archive_file.function_package.output_path} \
        --build-remote true
    EOT
  }

  depends_on = [
    azurerm_linux_function_app.this,
    azurerm_key_vault_access_policy.function_app,
  ]
}

# Grant the function app's identity read access to Key Vault secrets.
resource "azurerm_key_vault_access_policy" "function_app" {
  key_vault_id = var.key_vault_id
  tenant_id    = var.tenant_id
  object_id    = azurerm_linux_function_app.this.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}
