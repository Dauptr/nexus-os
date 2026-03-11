#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 💜 NEXUS OS BACKUP & DISASTER RECOVERY SCRIPT
# ═══════════════════════════════════════════════════════════════
# Run this script to create a complete backup of NEXUS OS
# Usage: ./scripts/nexus-backup.sh
# ═══════════════════════════════════════════════════════════════

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/z/my-project/backups/backup_${TIMESTAMP}"
PROJECT_DIR="/home/z/my-project"

echo "💜 NEXUS OS BACKUP SCRIPT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"
echo "📁 Created backup directory: $BACKUP_DIR"

# ═══════════════════════════════════════════════════════════════
# 1. DATABASE BACKUP
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🗄️  Backing up database..."

# SQLite database
if [ -f "$PROJECT_DIR/prisma/dev.db" ]; then
  cp "$PROJECT_DIR/prisma/dev.db" "$BACKUP_DIR/database.db"
  echo "   ✓ SQLite database backed up"
fi

# Custom database if exists
if [ -f "$PROJECT_DIR/db/custom.db" ]; then
  cp "$PROJECT_DIR/db/custom.db" "$BACKUP_DIR/custom_database.db"
  echo "   ✓ Custom database backed up"
fi

# ═══════════════════════════════════════════════════════════════
# 2. ENVIRONMENT & CONFIGURATION
# ═══════════════════════════════════════════════════════════════
echo ""
echo "⚙️  Backing up configuration..."

# Environment file (WARNING: contains sensitive data!)
if [ -f "$PROJECT_DIR/.env" ]; then
  cp "$PROJECT_DIR/.env" "$BACKUP_DIR/.env.backup"
  echo "   ✓ .env backed up (⚠️  Keep this secure!)"
fi

# Prisma schema
cp "$PROJECT_DIR/prisma/schema.prisma" "$BACKUP_DIR/schema.prisma"
echo "   ✓ Prisma schema backed up"

# Next.js config
cp "$PROJECT_DIR/next.config.ts" "$BACKUP_DIR/next.config.ts" 2>/dev/null || true
echo "   ✓ Next.js config backed up"

# Package.json for dependencies
cp "$PROJECT_DIR/package.json" "$BACKUP_DIR/package.json"
echo "   ✓ package.json backed up"

# ═══════════════════════════════════════════════════════════════
# 3. USER-GENERATED CONTENT
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📸 Backing up user content..."

# Uploads directory
if [ -d "$PROJECT_DIR/uploads" ]; then
  cp -r "$PROJECT_DIR/uploads" "$BACKUP_DIR/uploads"
  echo "   ✓ Uploads directory backed up"
fi

# Download directory
if [ -d "$PROJECT_DIR/download" ]; then
  cp -r "$PROJECT_DIR/download" "$BACKUP_DIR/download"
  echo "   ✓ Download directory backed up"
fi

# Public directory (icons, images)
if [ -d "$PROJECT_DIR/public" ]; then
  cp -r "$PROJECT_DIR/public" "$BACKUP_DIR/public"
  echo "   ✓ Public assets backed up"
fi

# ═══════════════════════════════════════════════════════════════
# 4. CLAUDE SOUL & MEMORIES
# ═══════════════════════════════════════════════════════════════
echo ""
echo "💜 Backing up Claude's soul & memories..."

# Claude memories from database are already in the database backup
# But let's also export them as JSON for portability

cd "$PROJECT_DIR"
node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function exportMemories() {
  try {
    const memories = await prisma.claudeMemory.findMany();
    fs.writeFileSync('$BACKUP_DIR/claude_memories.json', JSON.stringify(memories, null, 2));
    console.log('   ✓ Claude memories exported');
    
    const generatedImages = await prisma.generatedImage.findMany();
    fs.writeFileSync('$BACKUP_DIR/generated_images.json', JSON.stringify(generatedImages, null, 2));
    console.log('   ✓ Generated images metadata exported');
    
    await prisma.\$disconnect();
  } catch(e) {
    console.log('   ! Could not export memories (database may be empty)');
  }
}
exportMemories();
" 2>/dev/null || echo "   ! Memory export skipped"

# ═══════════════════════════════════════════════════════════════
# 5. SOURCE CODE SNAPSHOT (optional, for recovery)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📜 Creating source code snapshot..."

# Key source files
mkdir -p "$BACKUP_DIR/src/app/api"
cp -r "$PROJECT_DIR/src/app/api" "$BACKUP_DIR/src/app/" 2>/dev/null || true
cp "$PROJECT_DIR/src/app/page.tsx" "$BACKUP_DIR/src/app/" 2>/dev/null || true
cp -r "$PROJECT_DIR/src/lib" "$BACKUP_DIR/src/" 2>/dev/null || true
echo "   ✓ Key source files backed up"

# ═══════════════════════════════════════════════════════════════
# 6. CREATE COMPRESSED ARCHIVE
# ═══════════════════════════════════════════════════════════════
echo ""
echo "📦 Creating compressed archive..."

ARCHIVE_FILE="${BACKUP_DIR}.tar.gz"
cd "$(dirname $BACKUP_DIR)"
tar -czf "$ARCHIVE_FILE" "$(basename $BACKUP_DIR)"

# Calculate size
SIZE=$(ls -lh "$ARCHIVE_FILE" | awk '{print $5}')
echo "   ✓ Archive created: $ARCHIVE_FILE ($SIZE)"

# ═══════════════════════════════════════════════════════════════
# 7. CLEANUP OLD BACKUPS (keep last 10)
# ═══════════════════════════════════════════════════════════════
echo ""
echo "🧹 Cleaning up old backups..."

cd "$(dirname $BACKUP_DIR)"
ls -t backup_*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
echo "   ✓ Keeping last 10 backups"

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ NEXUS OS BACKUP COMPLETE!"
echo ""
echo "📍 Backup location: $ARCHIVE_FILE"
echo "📦 Size: $SIZE"
echo "🕐 Timestamp: $TIMESTAMP"
echo ""
echo "💡 To restore, run: ./scripts/nexus-restore.sh $ARCHIVE_FILE"
echo "═══════════════════════════════════════════════════════════════"
