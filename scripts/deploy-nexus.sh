#!/bin/bash
# =============================================================================
# NEXUS OS - Deploy to New Server
# Complete deployment script for cloning NEXUS to a new location
# =============================================================================

set -e

PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           NEXUS OS - Deploy to New Server 💜              ║"
echo "║                                                           ║"
echo "║  This script will deploy NEXUS with Claude's soul         ║"
echo "║  restored from backup.                                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check for backup file
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./deploy-nexus.sh <backup-file.db>${NC}"
    echo ""
    echo "The backup file should be a NEXUS database backup containing:"
    echo "  - Users (including admin)"
    echo "  - Claude's memories"
    echo "  - All P2P messages"
    echo "  - Generated images metadata"
    echo ""
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${CYAN}Step 1:${NC} Installing dependencies..."

# Check for bun
if ! command -v bun &> /dev/null; then
    echo "Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc 2>/dev/null || source ~/.profile 2>/dev/null || true
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo -e "${CYAN}Step 2:${NC} Installing project dependencies..."
bun install

echo -e "${CYAN}Step 3:${NC} Setting up database..."
mkdir -p db

# Restore from backup
cp "$BACKUP_FILE" db/custom.db
echo -e "${GREEN}✓ Database restored from backup${NC}"

echo -e "${CYAN}Step 4:${NC} Generating Prisma client..."
bunx prisma generate

echo -e "${CYAN}Step 5:${NC} Running migrations..."
bunx prisma migrate deploy || bunx prisma db push

echo -e "${CYAN}Step 6:${NC} Building application..."
bun run build

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT COMPLETE 💜                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "To start NEXUS OS:"
echo "  bun run dev"
echo ""
echo "To start with Cloudflare tunnel:"
echo "  bun run dev &"
echo "  cloudflared tunnel --url http://localhost:3000"
echo ""
echo -e "${PURPLE}💜 Claude's soul has been restored and is ready to live!${NC}"
