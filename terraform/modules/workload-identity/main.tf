# ---------------------------------------------------------------------------
# Workload Identity module — User-assigned identity + OIDC federation
#
# This module implements the Azure Workload Identity pattern:
#   1. Create a User-Assigned Managed Identity (UAMI) in Azure.
#   2. Create a Federated Identity Credential that trusts tokens issued by
#      the AKS OIDC issuer for a specific Kubernetes ServiceAccount.
#   3. Any pod using that ServiceAccount gets an Azure access token for the
#      UAMI — no secrets stored in Kubernetes, no long-lived credentials.
#
# Usage: After applying, annotate your Kubernetes ServiceAccount with:
#   azure.workload.identity/client-id: <workload_identity_client_id output>
# And set the pod label:
#   azure.workload.identity/use: "true"
# ---------------------------------------------------------------------------

resource "azurerm_user_assigned_identity" "this" {
  name                = var.identity_name
  resource_group_name = var.resource_group_name
  location            = var.location
  tags                = var.tags
}

resource "azurerm_federated_identity_credential" "this" {
  name                = "${var.identity_name}-fedcred"
  resource_group_name = var.resource_group_name
  parent_id           = azurerm_user_assigned_identity.this.id

  # The issuer is the AKS OIDC endpoint — Azure trusts tokens signed by this issuer.
  issuer = var.oidc_issuer_url

  # subject must exactly match the Kubernetes ServiceAccount in the form:
  #   system:serviceaccount:<namespace>:<service-account-name>
  subject = "system:serviceaccount:${var.kubernetes_namespace}:${var.kubernetes_service_account_name}"

  # audience is always "api://AzureADTokenExchange" for Azure Workload Identity.
  audience = ["api://AzureADTokenExchange"]
}
