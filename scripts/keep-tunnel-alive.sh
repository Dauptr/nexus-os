#!/bin/bash
# NEXUS OS Tunnel Keep-Alive Script

TUNNEL_TOKEN="eyJhIjoiYTg5ZmE0ZmEwZDI5MzU3MjEzODQ5YmUxZjdlNWM4ZjEiLCJ0IjoiYjk3MjI5OTAtY2VmZS00NDNlLWE5YTctZTI2MTI4M2YwNTdkIiwicyI6Ik1UZzFOalV3TkdFdFlUUXhNaTAwWVRNMExXRTBORGN0TW1VM04yTXdZVGxpTWpaaCJ9"

while true; do
    if ! pgrep -f "cloudflared tunnel run" > /dev/null; then
        echo "[$(date)] Tunnel down, restarting..." >> /home/z/my-project/download/tunnel_restart.log
        nohup /tmp/cloudflared tunnel run --token $TUNNEL_TOKEN >> /home/z/my-project/download/named_tunnel.log 2>&1 &
    fi
    sleep 60
done
