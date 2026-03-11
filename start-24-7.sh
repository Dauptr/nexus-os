#!/bin/bash
# NEXUS OS - Keep-Alive Runner
# This script keeps NEXUS running 24/7 with auto-restart

cd /home/z/my-project
LOG_DIR="/home/z/my-project/logs"
mkdir -p "$LOG_DIR"

echo "[$(date)] Starting NEXUS OS 24/7 runner..."

while true; do
    echo "[$(date)] Starting server..." >> "$LOG_DIR/nexus-runner.log"
    
    # Start Next.js server
    npm run dev >> "$LOG_DIR/nexus-out.log" 2>&1
    
    # If we get here, the server crashed
    echo "[$(date)] Server stopped! Restarting in 5 seconds..." >> "$LOG_DIR/nexus-runner.log"
    sleep 5
done
