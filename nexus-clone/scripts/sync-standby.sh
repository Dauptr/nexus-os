#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NEXUS OS - Hot Standby Sync (rsync)
# ═══════════════════════════════════════════════════════════════
# Keeps a standby server in sync with the primary NEXUS server.
# If primary fails, standby can take over instantly.
#
# Usage:
#   ./sync-standby.sh setup    # Configure standby server
#   ./sync-standby.sh sync     # Run sync now
#   ./sync-standby.sh daemon   # Run continuous sync
# ═══════════════════════════════════════════════════════════════

set -e

PURPLE='\033[0;35m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Configuration
STANDBY_HOST="${STANDBY_HOST:-}"
STANDBY_USER="${STANDBY_USER:-root}"
STANDBY_PATH="${STANDBY_PATH:-/opt/nexus}"
SYNC_INTERVAL="${SYNC_INTERVAL:-60}"  # seconds

# Directories to sync
SYNC_DIRS=(
    "db"
    "backups"
    "public/uploads"
)

setup_standby() {
    echo -e "${PURPLE}🔧 Setting up standby server...${NC}"
    
    if [ -z "$STANDBY_HOST" ]; then
        read -p "Enter standby server hostname/IP: " STANDBY_HOST
        read -p "Enter SSH user [root]: " STANDBY_USER
        STANDBY_USER=${STANDBY_USER:-root}
        read -p "Enter target path [/opt/nexus]: " STANDBY_PATH
        STANDBY_PATH=${STANDBY_PATH:-/opt/nexus}
    fi
    
    echo ""
    echo "Configuring standby:"
    echo "  Host: $STANDBY_HOST"
    echo "  User: $STANDBY_USER"
    echo "  Path: $STANDBY_PATH"
    echo ""
    
    # Test SSH connection
    echo "Testing SSH connection..."
    if ssh -o ConnectTimeout=5 ${STANDBY_USER}@${STANDBY_HOST} "echo OK" 2>/dev/null; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️ SSH connection failed. Make sure SSH keys are set up.${NC}"
        echo "Run: ssh-copy-id ${STANDBY_USER}@${STANDBY_HOST}"
        exit 1
    fi
    
    # Create target directory
    echo "Creating directories on standby..."
    ssh ${STANDBY_USER}@${STANDBY_HOST} "mkdir -p $STANDBY_PATH/{db,backups,public/uploads}"
    
    # Save configuration
    cat > .standby-config << EOF
STANDBY_HOST=$STANDBY_HOST
STANDBY_USER=$STANDBY_USER
STANDBY_PATH=$STANDBY_PATH
SYNC_INTERVAL=$SYNC_INTERVAL
EOF
    
    echo -e "${GREEN}✅ Standby configured!${NC}"
}

sync_to_standby() {
    echo -e "${PURPLE}🔄 Syncing to standby server...${NC}"
    
    if [ ! -f ".standby-config" ]; then
        echo "❌ Run './sync-standby.sh setup' first"
        exit 1
    fi
    
    source .standby-config
    
    START_TIME=$(date +%s)
    
    for DIR in "${SYNC_DIRS[@]}"; do
        if [ -d "$DIR" ]; then
            echo "  → Syncing $DIR..."
            rsync -az --delete \
                --exclude='*.log' \
                --exclude='node_modules' \
                --exclude='.next' \
                $DIR/ ${STANDBY_USER}@${STANDBY_HOST}:${STANDBY_PATH}/$DIR/
        fi
    done
    
    # Also sync key files
    echo "  → Syncing application files..."
    rsync -az \
        --include='package.json' \
        --include='Dockerfile' \
        --include='docker-compose.yml' \
        --include='docker-entrypoint.sh' \
        --include='*.config.*' \
        --include='prisma/***' \
        --include='src/***' \
        --exclude='*' \
        ./ ${STANDBY_USER}@${STANDBY_HOST}:${STANDBY_PATH}/
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    echo -e "${GREEN}✅ Sync completed in ${DURATION}s${NC}"
    echo "  Timestamp: $(date)"
}

daemon_mode() {
    echo -e "${PURPLE}🔄 Starting continuous sync daemon...${NC}"
    echo "  Interval: ${SYNC_INTERVAL}s"
    echo ""
    
    while true; do
        echo "$(date): Starting sync..."
        sync_to_standby
        echo "$(date): Sleeping for ${SYNC_INTERVAL}s..."
        sleep $SYNC_INTERVAL
    done
}

# Main
case "$1" in
    setup)
        setup_standby
        ;;
    sync)
        sync_to_standby
        ;;
    daemon)
        daemon_mode
        ;;
    *)
        echo "Usage: $0 {setup|sync|daemon}"
        echo ""
        echo "Commands:"
        echo "  setup  - Configure standby server connection"
        echo "  sync   - Run one-time sync"
        echo "  daemon - Run continuous sync in background"
        ;;
esac
