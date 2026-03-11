#!/bin/bash

# NEXUS OS - Cloudflare Tunnel Keep-Alive Script
# This script monitors and auto-restarts the tunnel if it goes down

TUNNEL_URL="http://localhost:3000"
LOG_FILE="/tmp/tunnel-monitor.log"
CLOUDFLARED="/tmp/cloudflared"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
    echo "$1"
}

check_tunnel() {
    if pgrep -f "cloudflared tunnel" > /dev/null; then
        return 0  # Running
    else
        return 1  # Not running
    fi
}

start_tunnel() {
    log "Starting Cloudflare tunnel..."
    
    if [ ! -f "$CLOUDFLARED" ]; then
        log "Downloading cloudflared..."
        curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o "$CLOUDFLARED"
        chmod +x "$CLOUDFLARED"
    fi
    
    nohup "$CLOUDFLARED" tunnel --url "$TUNNEL_URL" > /tmp/tunnel-output.log 2>&1 &
    sleep 5
    
    if check_tunnel; then
        URL=$(grep -oP 'https://[^\s]+\.trycloudflare\.com' /tmp/tunnel-output.log | head -1)
        log "✅ Tunnel started: $URL"
        echo "$URL" > /tmp/tunnel-url.txt
    else
        log "❌ Failed to start tunnel"
    fi
}

log "=== Tunnel Monitor Started ==="

while true; do
    if ! check_tunnel; then
        log "⚠️ Tunnel is down! Restarting..."
        start_tunnel
    fi
    sleep 30
done
