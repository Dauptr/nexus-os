#!/bin/bash
# NEXUS OS Watchdog - Auto-restart if server goes down
# Runs every minute via cron

LOG_FILE="/home/z/my-project/logs/watchdog.log"
MAX_LOG_SIZE=1048576 # 1MB

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG_FILE"
}

# Rotate log if too big
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "$LOG_FILE.old"
fi

# Check if server is responding
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|304"; then
    log "Server not responding! Attempting restart..."
    
    # Kill any stale processes
    pkill -f "next dev" 2>/dev/null
    sleep 2
    
    # Restart the server
    cd /home/z/my-project
    nohup npm run dev > /home/z/my-project/logs/nexus-out.log 2>&1 &
    
    log "Restart initiated. Waiting for server..."
    sleep 10
    
    # Verify restart
    if curl -s -o /dev/null http://localhost:3000; then
        log "Server restarted successfully!"
    else
        log "ERROR: Server restart failed!"
    fi
fi
