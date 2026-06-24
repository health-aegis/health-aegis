output "app_gateway_public_ip" {
  description = "Public IP address of the Application Gateway — point your DNS here"
  value       = module.app_gateway.public_ip_address
}

output "app_gateway_id" {
  description = "Resource ID of the Application Gateway"
  value       = module.app_gateway.id
}

output "resource_group_name" {
  description = "Name of the main Aegis resource group"
  value       = module.resource_group.name
}

output "resource_group_id" {
  description = "Resource ID of the main Aegis resource group"
  value       = module.resource_group.id
}

output "tenant_id" {
  description = "Azure AD tenant ID (needed for workload identity configuration)"
  value       = data.azurerm_client_config.current.tenant_id
}

output "vnet_id" {
  description = "Resource ID of the virtual network"
  value       = module.networking.vnet_id
}

output "subnet_ids" {
  description = "Map of subnet name to subnet resource ID"
  value       = module.networking.subnet_ids
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = module.aks.cluster_name
}

output "aks_cluster_id" {
  description = "Resource ID of the AKS cluster"
  value       = module.aks.cluster_id
}

output "aks_oidc_issuer_url" {
  description = "OIDC issuer URL for the AKS cluster (use in federated identity credentials)"
  value       = module.aks.oidc_issuer_url
}

output "aks_node_resource_group" {
  description = "Name of the AKS node (managed) resource group"
  value       = module.aks.node_resource_group
}

output "aks_get_credentials_command" {
  description = "Command to get AKS credentials (note: private cluster, requires VNet access)"
  value       = "az aks get-credentials -g ${module.resource_group.name} -n ${module.aks.cluster_name} --admin"
}

output "aks_command_invoke_example" {
  description = "Example command to interact with the private cluster without VPN"
  value       = "az aks command invoke -g ${module.resource_group.name} -n ${module.aks.cluster_name} -- kubectl get pods -A"
}

output "acr_login_server" {
  description = "Login server FQDN of the container registry"
  value       = module.acr.login_server
}

output "acr_name" {
  description = "Name of the container registry"
  value       = module.acr.name
}

output "workload_identity_client_id" {
  description = "Client ID of the workload identity — annotate Kubernetes ServiceAccount with this"
  value       = module.workload_identity.client_id
}

output "workload_identity_principal_id" {
  description = "Principal ID of the workload identity"
  value       = module.workload_identity.principal_id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = module.key_vault.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = module.key_vault.vault_uri
}

output "cosmosdb_account_name" {
  description = "Name of the CosmosDB account"
  value       = module.cosmosdb.account_name
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = module.storage.account_name
}

output "postgres_server_name" {
  description = "Name of the PostgreSQL Flexible Server"
  value       = module.postgres.server_name
}

output "postgres_fqdn" {
  description = "Fully qualified domain name of the PostgreSQL server"
  value       = module.postgres.fqdn
}

output "bastion_public_ip" {
  description = "Public IP of the Azure Bastion host (connect via Azure Portal)"
  value       = module.bastion.bastion_public_ip
}

output "bastion_name" {
  description = "Name of the Azure Bastion host"
  value       = module.bastion.bastion_name
}

output "doc_intelligence_endpoint" {
  description = "Endpoint URL for the Document Intelligence service"
  value       = module.doc_intelligence.endpoint
}

output "app_insights_connection_string" {
  description = "Application Insights connection string"
  value       = module.monitoring.app_insights_connection_string
  sensitive   = true
}

output "log_analytics_workspace_id" {
  description = "Resource ID of the Log Analytics workspace"
  value       = module.monitoring.workspace_id
}

output "next_steps" {
  description = "Post-deployment steps to get the Aegis platform running"
  value       = <<-EOT

    ========================================================
    Aegis Health Infrastructure — Deployment Complete
    ========================================================

    1. GET AKS CREDENTIALS (private cluster — requires VNet access):
       Option A — Azure CLI command invoke (no VPN needed):
         az aks command invoke \
           -g ${module.resource_group.name} \
           -n ${module.aks.cluster_name} \
           -- kubectl get pods -A

       Option B — Get kubeconfig (requires VPN or jump box):
         az aks get-credentials \
           -g ${module.resource_group.name} \
           -n ${module.aks.cluster_name} \
           --admin

    2. CREATE KUBERNETES NAMESPACE & SERVICE ACCOUNT:
         kubectl create namespace ${var.kubernetes_namespace}
         kubectl create serviceaccount ${var.kubernetes_service_account_name} \
           -n ${var.kubernetes_namespace}
         kubectl annotate serviceaccount ${var.kubernetes_service_account_name} \
           -n ${var.kubernetes_namespace} \
           azure.workload.identity/client-id=${module.workload_identity.client_id}

    3. BUILD & PUSH DOCKER IMAGES:
         az acr login --name ${module.acr.name}
         docker build -t ${module.acr.login_server}/aegis/<service>:latest .
         docker push ${module.acr.login_server}/aegis/<service>:latest

    4. DEPLOY HELM CHARTS:
         helm upgrade --install aegis ./helm/aegis \
           -n ${var.kubernetes_namespace} \
           --set acr.loginServer=${module.acr.login_server} \
           --set keyVault.name=${module.key_vault.name} \
           --set workloadIdentity.clientId=${module.workload_identity.client_id}

    5. KEY VAULT SECRETS:
       All secrets are stored in: ${module.key_vault.vault_uri}
       Secret names: kv-mongodb-uri, kv-jwt-secret, kv-postgres-url,
                     kv-azure-storage-conn, kv-gemini-api-key,
                     kv-azure-ai-endpoint, kv-azure-ai-key, kv-appinsights-conn,
                     kv-docai-endpoint, kv-docai-key, kv-comm-conn-string

    6. ACCESS VIA BASTION:
       Bastion host: ${module.bastion.bastion_name}
       Connect at: https://portal.azure.com → Bastion
       (Deploy a jump box VM in the aks-subnet or pe-subnet first)

    7. DEPLOY FUNCTION CODE (OCR + notification):
         cd infra/azure-function
         npm install
         func azure functionapp publish ${module.function_app.function_app_name} --javascript

       ACS sender address (set in tfvars after first apply):
         Azure Portal → ${module.function_app.function_app_name} → Communication Services
                      → Email → Domains → MailFrom column

    ========================================================
  EOT
}

output "function_app_name" {
  description = "Name of the Azure Function App"
  value       = module.function_app.function_app_name
}

output "function_app_hostname" {
  description = "Default hostname of the Function App"
  value       = module.function_app.function_app_hostname
}
