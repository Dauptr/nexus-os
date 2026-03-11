#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 💜 NEXUS OS RESTORE SCRIPT
# ═══════════════════════════════════════════════════════════════
# Restore NEXUS OS from a backup archive
# Usage: ./scripts/nexus-restore.sh backup_file.tar.gz
# ═══════════════════════════════════════════════════════════════

set -e

if [ -z "$1" ]; then
  echo "❌ Usage: ./scripts/nexus-restore.sh <backup_file.tar.gz>"
  echo ""
  echo "Available backups:"
  ls -lh /home/z/my-project/backups/*.tar.gz 2>/dev/null || echo "   No backups found"
  exit 1
fi

BACKUP_FILE="$1"
PROJECT_DIR="/home/z/my-project"
RESTORE_DIR="/tmp/nexus_restore_$$"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "💜 NEXUS OS RESTORE SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📦 Backup file: $BACKUP_FILE"
echo ""

# Confirm restore
read -p "⚠️  This will overwrite current data. Continue? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "❌ Restore cancelled"
  exit 1
fi

# Extract backup
echo "📂 Extracting backup..."
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
BACKUP_DIR=$(ls "$RESTORE_DIR")
echo "   ✓ Extracted to $RESTORE_DIR/$BACKUP_DIR"

# ═══════════════════════════════════════════════════════════════
# RESTORE DATABASE
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🗄️  Restoring database..."

if [ -f "$RESTORE_DIR/$BACKUP_DIR/database.db" ]; then
  # Create backup of current database first
  if [ -f "$PROJECT_DIR/prisma/dev.db" ]; then
    cp "$PROJECT_DIR/prisma/dev.db" "$PROJECT_DIR/prisma/dev.db.pre_restore_$(date +%Y%m%d_%H%M%S)"
    echo "   ✓ Current database backed up"
  fi
  cp "$RESTORE_DIR/$BACKUP_DIR/database.db" "$PROJECT_DIR/prisma/dev.db"
  echo "   ✓ Database restored"
fi

# ═══════════════════════════════════════════════════════════════
# RESTORE CONFIGURATION
# ═══════════════════════════════════════════════════════════════
echo ""
echo "⚙️  Restoring configuration..."

if [ -f "$RESTORE_DIR/$BACKUP_DIR/.env.backup" ]; then
  read -p "   Restore .env file? (yes/no): " restore_env
  if [ "$restore_env" = "yes" ]; then
    cp "$RESTORE_DIR/$BACKUP_DIR/.env.backup" "$PROJECT_DIR/.env"
    echo "   ✓ .env restored"
  fi
fi

# ═══════════════════════════════════════════════════════════════
# RESTORE USER CONTENT
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📸 Restoring user content..."

if [ -d "$RESTORE_DIR/$BACKUP_DIR/uploads" ]; then
  cp -r "$RESTORE_DIR/$BACKUP_DIR/uploads" "$PROJECT_DIR/" 2>/dev/null || true
  echo "   ✓ Uploads restored"
fi

if [ -d "$RESTORE_DIR/$BACKUP_DIR/download" ]; then
  cp -r "$RESTORE_DIR/$BACKUP_DIR/download" "$PROJECT_DIR/" 2>/dev/null || true
  echo "   ✓ Downloads restored"
fi

# ═══════════════════════════════════════════════════════════════
# CLEANUP
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🧹 Cleaning up..."
rm -rf "$RESTORE_DIR"
echo "   ✓ Temporary files removed"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ NEXUS OS RESTORE COMPLETE!"
echo ""
echo "⚠️  IMPORTANT: Restart your development server to apply changes:"
echo "   bun run dev"
echo "═══════════════════════════════════════════════════════════════"
