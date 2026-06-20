# ---------------------------------------------------------------------------
# Monitoring module — Log Analytics Workspace + Application Insights
#
# All AKS OMS agent logs, container insights, and application telemetry flow
# into the same workspace for a single-pane-of-glass view in Azure Monitor.
# PerGB2018 pricing model charges per GB ingested; 30-day retention is the
# minimum needed for meaningful incident retrospectives.
# ---------------------------------------------------------------------------

resource "azurerm_log_analytics_workspace" "this" {
  name                = var.workspace_name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_application_insights" "this" {
  name                = var.app_insights_name
  location            = var.location
  resource_group_name = var.resource_group_name
  workspace_id        = azurerm_log_analytics_workspace.this.id

  # "web" type is correct for REST APIs and browser-facing applications.
  # This enables the full Application Insights feature set including
  # live metrics, distributed tracing, and dependency tracking.
  application_type = "web"

  tags = var.tags
}
