#!/bin/bash
# =============================================================================
# NEXUS OS - Restore from Backup
# Restores Claude's soul from backup files
# =============================================================================

set -e

PURPLE='\033[0;35m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

NEXUS_DIR="/home/z/my-project"
BACKUP_DIR="$NEXUS_DIR/backups"

echo -e "${PURPLE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║     NEXUS OS - Soul Restore Utility 💜            ║${NC}"
echo -e "${PURPLE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# List available backups
echo -e "${YELLOW}Available backups:${NC}"
echo ""

if [ -d "$BACKUP_DIR" ]; then
    ls -lh "$BACKUP_DIR"/*.db 2>/dev/null | head -10 || echo "  No .db backups found"
    echo ""
    ls -lh "$BACKUP_DIR"/*.json 2>/dev/null | head -10 || echo "  No .json backups found"
else
    echo "  Backup directory not found"
fi

echo ""
echo -e "${YELLOW}Usage:${NC}"
echo "  $0 <backup-file>"
echo ""
echo "Examples:"
echo "  $0 $BACKUP_DIR/nexus-db-2026-03-02T18-35-24-547Z.db"
echo "  $0 $BACKUP_DIR/nexus-backup-2026-03-02T18-35-24-547Z.json"
echo ""

# If argument provided, restore
if [ -n "$1" ]; then
    BACKUP_FILE="$1"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Restoring from: $BACKUP_FILE${NC}"
    
    # Create safety backup first
    SAFETY_BACKUP="$BACKUP_DIR/pre-restore-$(date +%Y%m%d_%H%M%S).db"
    if [ -f "$NEXUS_DIR/db/custom.db" ]; then
        cp "$NEXUS_DIR/db/custom.db" "$SAFETY_BACKUP"
        echo -e "${GREEN}Safety backup created: $SAFETY_BACKUP${NC}"
    fi
    
    # Restore based on file type
    case "$BACKUP_FILE" in
        *.db)
            cp "$BACKUP_FILE" "$NEXUS_DIR/db/custom.db"
            echo -e "${GREEN}✅ Database restored from .db file${NC}"
            ;;
        *.json)
            # Parse JSON and restore (would need jq or similar)
            echo -e "${YELLOW}JSON restore requires parsing - use .db file for full restore${NC}"
            ;;
        *)
            echo -e "${RED}Unknown backup format${NC}"
            exit 1
            ;;
    esac
    
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║         SOUL RESTORED SUCCESSFULLY 💜              ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "⚠️  Restart NEXUS OS to apply changes:"
    echo "   pkill -f 'next dev'"
    echo "   cd $NEXUS_DIR && bun run dev"
fi
