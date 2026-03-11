#!/bin/bash
# NEXUS OS Cloudflare Tunnel Setup
# Domain: n-e-x-u-s-o-s.com

TUNNEL_NAME="nexus-os"
DOMAIN="n-e-x-u-s-o-s.com"
CLOUDFLARED="/home/z/cloudflared"

echo "═══════════════════════════════════════════════════════════"
echo "🚀 NEXUS OS - Cloudflare Tunnel Setup"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Domain: $DOMAIN"
echo ""

# Check if already logged in
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "⚠️  Not logged in to Cloudflare"
    echo "Please run: $CLOUDFLARED tunnel login"
    echo "Then select domain: $DOMAIN"
    echo ""
    read -p "Press Enter after you've logged in..."
fi

# Create tunnel if not exists
echo "📦 Checking/Creating tunnel '$TUNNEL_NAME'..."
TUNNEL_ID=$($CLOUDFLARED tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')

if [ -z "$TUNNEL_ID" ]; then
    echo "Creating new tunnel..."
    $CLOUDFLARED tunnel create $TUNNEL_NAME
    TUNNEL_ID=$($CLOUDFLARED tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
fi

echo "✅ Tunnel ID: $TUNNEL_ID"

# Create config file
echo "📝 Creating tunnel config..."
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: $TUNNEL_ID
credentials-file: ~/.cloudflared/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:3000
  - hostname: www.$DOMAIN
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "✅ Config created"

# Create DNS records
echo "🌐 Creating DNS records..."
$CLOUDFLARED tunnel route dns $TUNNEL_NAME $DOMAIN 2>/dev/null || echo "DNS for $DOMAIN may already exist"
$CLOUDFLARED tunnel route dns $TUNNEL_NAME www.$DOMAIN 2>/dev/null || echo "DNS for www.$DOMAIN may already exist"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Setup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🚀 To start the tunnel, run:"
echo "   $CLOUDFLARED tunnel run $TUNNEL_NAME"
echo ""
echo "Or run in background:"
echo "   nohup $CLOUDFLARED tunnel run $TUNNEL_NAME > /tmp/nexus-tunnel.log 2>&1 &"
echo ""
echo "🌐 Your site will be available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
