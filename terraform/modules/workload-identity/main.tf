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
