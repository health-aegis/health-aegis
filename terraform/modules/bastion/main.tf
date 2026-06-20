# ---------------------------------------------------------------------------
# Azure Bastion module — secure SSH/RDP access to private VNet resources
#
# Azure Bastion provides browser-based SSH/RDP access to VMs inside the VNet
# WITHOUT exposing SSH/RDP ports to the public internet. All connections
# go through the Azure Portal over HTTPS (port 443).
#
# WHY Bastion for a private AKS cluster?
#   The AKS API server has no public endpoint. To run kubectl from outside
#   the VNet, you need either:
#     1. "az aks command invoke" (limited, no local kubeconfig)
#     2. A jump box VM in the VNet + Azure Bastion to reach it
#   Bastion is option 2's entry point — connect to the jump box VM via
#   Bastion, then run kubectl from inside the VNet.
#
# SUBNET REQUIREMENT:
#   The subnet MUST be named exactly "AzureBastionSubnet" — Azure refuses
#   any other name. This is created in the networking module.
#   Minimum /27, we use /26 for headroom.
#
# SKU = "Basic":
#   Sufficient for dev. Supports native client (SSH/RDP) and file transfer.
#   Upgrade to "Standard" for production (custom ports, IP-based connections,
#   session recording, shareable links).
# ---------------------------------------------------------------------------

resource "azurerm_public_ip" "bastion" {
  name                = "${var.name}-bastion-pip"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags
}

resource "azurerm_bastion_host" "this" {
  name                = "${var.name}-bastion"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Basic"

  ip_configuration {
    name                 = "bastion-ipconfig"
    subnet_id            = var.bastion_subnet_id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }

  tags = var.tags
}
