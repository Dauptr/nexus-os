#!/bin/bash
# Quick backup script for systemd service

BACKUP_DIR="/home/z/my-project/backups"
DB_FILE="/home/z/my-project/db/custom.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/auto-shutdown-$TIMESTAMP.db"
    echo "Backup created: auto-shutdown-$TIMESTAMP.db"
fi
