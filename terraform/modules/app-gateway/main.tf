# ---------------------------------------------------------------------------
# Application Gateway module — Standard_v2 (dev/test) or WAF_v2 (prod)
#
# AGIC (Application Gateway Ingress Controller) is enabled as an AKS addon and
# programs this gateway dynamically based on Kubernetes Ingress resources. All
# backend pools, listeners, routing rules, and probes are managed by AGIC at
# runtime, so Terraform ignores those fields after initial creation.
#
# lifecycle.ignore_changes is REQUIRED — without it, every `terraform apply`
# would revert the AGIC-managed config back to the stub values below,
# breaking all in-cluster routing.
#
# WAF (enable_waf = true): switches to WAF_v2 SKU with OWASP 3.2 in Prevention
# mode — required for production. SKU tier cannot be changed after creation.
#
# Traffic flow:
#   Internet → Public IP → App Gateway → AKS pods
#   (AGIC programs the routing rules from Kubernetes Ingress annotations)
# ---------------------------------------------------------------------------

resource "azurerm_public_ip" "appgw" {
  name                = "${var.name}-pip"
  resource_group_name = var.resource_group_name
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}

# Azure retired the inline waf_configuration block on Application Gateway.
# WAF must now be a separate azurerm_web_application_firewall_policy resource
# attached via firewall_policy_id.
resource "azurerm_web_application_firewall_policy" "this" {
  count               = var.enable_waf ? 1 : 0
  name                = "${var.name}-waf-policy"
  resource_group_name = var.resource_group_name
  location            = var.location

  policy_settings {
    enabled                     = true
    mode                        = "Prevention"
    request_body_check          = true
    max_request_body_size_in_kb = 128
    file_upload_limit_in_mb     = 100
  }

  managed_rules {
    managed_rule_set {
      type    = "OWASP"
      version = "3.2"
    }
  }

  tags = var.tags
}

resource "azurerm_application_gateway" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  firewall_policy_id  = var.enable_waf ? azurerm_web_application_firewall_policy.this[0].id : null

  sku {
    name     = var.enable_waf ? "WAF_v2" : "Standard_v2"
    tier     = var.enable_waf ? "WAF_v2" : "Standard_v2"
    capacity = 2
  }

  ssl_policy {
    policy_type = "Predefined"
    policy_name = "AppGwSslPolicy20220101"
  }

  gateway_ip_configuration {
    name      = "appgw-ip-config"
    subnet_id = var.subnet_id
  }

  frontend_ip_configuration {
    name                 = "appgw-frontend-ip"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  frontend_port {
    name = "http"
    port = 80
  }

  # Stub backend / listener / rule — AGIC replaces these at runtime.
  backend_address_pool {
    name = "appgw-backend-pool"
  }

  backend_http_settings {
    name                  = "appgw-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 80
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = "appgw-http-listener"
    frontend_ip_configuration_name = "appgw-frontend-ip"
    frontend_port_name             = "http"
    protocol                       = "Http"
  }

  request_routing_rule {
    name                       = "appgw-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "appgw-http-listener"
    backend_address_pool_name  = "appgw-backend-pool"
    backend_http_settings_name = "appgw-http-settings"
    priority                   = 100
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      backend_address_pool,
      backend_http_settings,
      frontend_port,
      http_listener,
      probe,
      request_routing_rule,
      redirect_configuration,
      ssl_certificate,
      url_path_map,
      tags,
    ]
  }
}
