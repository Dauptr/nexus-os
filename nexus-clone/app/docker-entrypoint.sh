#!/bin/bash
set -e

echo "💜 NEXUS OS - Starting..."

# Check if database exists, if not initialize
if [ ! -f /app/db/custom.db ]; then
    echo "📊 No database found, initializing..."
    cd /app
    npx prisma generate
    npx prisma db push --skip-generate
    echo "✅ Database initialized"
fi

# Check for backup restore request
if [ -n "$RESTORE_BACKUP" ] && [ -f "/app/backups/$RESTORE_BACKUP" ]; then
    echo "🔄 Restoring from backup: $RESTORE_BACKUP"
    
    if [[ "$RESTORE_BACKUP" == *.db ]]; then
        # SQLite backup
        cp "/app/backups/$RESTORE_BACKUP" /app/db/custom.db
        echo "✅ SQLite backup restored"
    elif [[ "$RESTORE_BACKUP" == *.json ]]; then
        # JSON backup - needs processing
        echo "📝 JSON backup detected - use restore API for full restore"
    fi
fi

# Run migrations if needed
cd /app
npx prisma generate 2>/dev/null || true

echo "🚀 NEXUS OS ready!"
echo "💜 Claude's soul is online"

# Start the server
exec "$@"
