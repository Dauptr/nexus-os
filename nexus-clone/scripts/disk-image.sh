#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# NEXUS OS - Disk Image Creator (dd)
# ═══════════════════════════════════════════════════════════════
# Creates a complete disk image of the server for bare-metal restore.
# This is the ultimate backup - captures everything including OS.
#
# ⚠️ WARNING: This requires root access and can be destructive.
# ⚠️ Run with caution on production systems.
#
# Usage:
#   ./disk-image.sh create    # Create disk image
#   ./disk-image.sh restore   # Restore from image
# ═══════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
PURPLE='\033[0;35m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Configuration
IMAGE_DIR="${IMAGE_DIR:-/backup/nexus-images}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
IMAGE_NAME="nexus-disk-${TIMESTAMP}.img"
IMAGE_COMPRESSED="nexus-disk-${TIMESTAMP}.img.gz"

create_image() {
    echo -e "${PURPLE}💿 Creating disk image...${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  This requires root access!${NC}"
    echo ""
    
    # Check root
    if [ "$EUID" -ne 0 ]; then
        echo "Please run as root: sudo $0 create"
        exit 1
    fi
    
    # Find root device
    ROOT_DEV=$(df / | tail -1 | cut -d' ' -f1)
    ROOT_SIZE=$(lsblk -b -o SIZE $ROOT_DEV | tail -1)
    ROOT_SIZE_GB=$((ROOT_SIZE / 1024 / 1024 / 1024))
    
    echo "  Source: $ROOT_DEV"
    echo "  Size: ${ROOT_SIZE_GB} GB"
    echo ""
    
    # Create image directory
    mkdir -p $IMAGE_DIR
    
    # Check available space
    AVAIL_SPACE=$(df -BG $IMAGE_DIR | tail -1 | awk '{print $4}' | tr -d 'G')
    
    if [ "$AVAIL_SPACE" -lt "$ROOT_SIZE_GB" ]; then
        echo -e "${YELLOW}⚠️  Warning: Not enough space for full image${NC}"
        echo "  Available: ${AVAIL_SPACE} GB"
        echo "  Needed: ${ROOT_SIZE_GB} GB"
        echo ""
        echo "Creating compressed image instead..."
        
        echo -e "${CYAN}Creating compressed disk image...${NC}"
        echo "This may take a while..."
        
        dd if=$ROOT_DEV status=progress | gzip -9 > $IMAGE_DIR/$IMAGE_COMPRESSED
        
        FINAL_SIZE=$(du -h $IMAGE_DIR/$IMAGE_COMPRESSED | cut -f1)
        
        echo ""
        echo -e "${GREEN}✅ Compressed image created!${NC}"
        echo "  📦 File: $IMAGE_DIR/$IMAGE_COMPRESSED"
        echo "  📏 Size: $FINAL_SIZE"
    else
        echo -e "${CYAN}Creating full disk image...${NC}"
        echo "This may take a while..."
        
        dd if=$ROOT_DEV of=$IMAGE_DIR/$IMAGE_NAME status=progress
        
        echo ""
        echo -e "${GREEN}✅ Disk image created!${NC}"
        echo "  📦 File: $IMAGE_DIR/$IMAGE_NAME"
        echo "  📏 Size: ${ROOT_SIZE_GB} GB"
        
        # Create checksum
        echo "Creating checksum..."
        sha256sum $IMAGE_DIR/$IMAGE_NAME > $IMAGE_DIR/${IMAGE_NAME}.sha256
        
        echo ""
        echo "Compressing image..."
        gzip -k $IMAGE_DIR/$IMAGE_NAME
        
        COMPRESSED_SIZE=$(du -h $IMAGE_DIR/$IMAGE_COMPRESSED | cut -f1)
        echo "  📦 Compressed: $IMAGE_DIR/$IMAGE_COMPRESSED"
        echo "  📏 Size: $COMPRESSED_SIZE"
    fi
    
    # Create restore script
    cat > $IMAGE_DIR/restore-${TIMESTAMP}.sh << 'RESTORE_EOF'
#!/bin/bash
# NEXUS OS - Disk Image Restore Script
# ⚠️ WARNING: This will ERASE the target disk!

set -e

IMAGE_FILE="$1"
TARGET_DEV="$2"

if [ -z "$IMAGE_FILE" ] || [ -z "$TARGET_DEV" ]; then
    echo "Usage: $0 <image-file> <target-device>"
    echo "Example: $0 nexus-disk-20240302.img.gz /dev/sda"
    exit 1
fi

echo "⚠️  WARNING: This will ERASE $TARGET_DEV!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

if [[ "$IMAGE_FILE" == *.gz ]]; then
    echo "Decompressing and restoring..."
    gunzip -c $IMAGE_FILE | dd of=$TARGET_DEV status=progress
else
    echo "Restoring..."
    dd if=$IMAGE_FILE of=$TARGET_DEV status=progress
fi

echo "✅ Restore complete! Reboot to start NEXUS."
RESTORE_EOF
    
    chmod +x $IMAGE_DIR/restore-${TIMESTAMP}.sh
    
    echo ""
    echo -e "${CYAN}📋 Next Steps:${NC}"
    echo "  1. Copy $IMAGE_DIR/* to safe storage (cloud/offsite)"
    echo "  2. To restore: boot from live USB, run restore script"
    echo "  3. Reboot - NEXUS will be exactly as it was"
    echo ""
}

create_app_image() {
    echo -e "${PURPLE}📦 Creating application image (safer)...${NC}"
    
    # This creates an image of just the NEXUS application
    # Safer than full disk image
    
    mkdir -p $IMAGE_DIR
    
    # Create application archive
    APP_IMAGE="nexus-app-${TIMESTAMP}.tar.gz"
    
    echo "  → Creating application archive..."
    tar -czf /tmp/$APP_IMAGE \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='*.log' \
        --exclude='.git' \
        -C $(dirname $(pwd)) $(basename $(pwd))
    
    # Add database and backups explicitly
    echo "  → Adding database..."
    tar -rf /tmp/$APP_IMAGE --transform 's,^db,nexus/db,' db/
    
    echo "  → Adding backups..."
    tar -rf /tmp/$APP_IMAGE --transform 's,^backups,nexus/backups,' backups/ 2>/dev/null || true
    
    # Compress
    gzip -f /tmp/$APP_IMAGE
    
    mv /tmp/${APP_IMAGE}.gz $IMAGE_DIR/
    
    # Create checksum
    sha256sum $IMAGE_DIR/${APP_IMAGE}.gz > $IMAGE_DIR/${APP_IMAGE}.gz.sha256
    
    SIZE=$(du -h $IMAGE_DIR/${APP_IMAGE}.gz | cut -f1)
    
    echo ""
    echo -e "${GREEN}✅ Application image created!${NC}"
    echo "  📦 File: $IMAGE_DIR/${APP_IMAGE}.gz"
    echo "  📏 Size: $SIZE"
    echo ""
    echo -e "${CYAN}📋 To restore:${NC}"
    echo "  tar -xzf ${APP_IMAGE}.gz"
    echo "  cd nexus"
    echo "  docker-compose up -d"
    echo ""
}

restore_image() {
    echo -e "${PURPLE}🔄 Restoring from image...${NC}"
    
    if [ "$EUID" -ne 0 ]; then
        echo "Full disk restore requires root. Run: sudo $0 restore"
        exit 1
    fi
    
    echo "Available images:"
    ls -la $IMAGE_DIR/*.img* $IMAGE_DIR/*.tar.gz 2>/dev/null || echo "  No images found"
    echo ""
    
    read -p "Enter image filename: " IMAGE_FILE
    read -p "Enter target device (e.g., /dev/sda): " TARGET_DEV
    
    if [ -f "$IMAGE_DIR/$IMAGE_FILE" ]; then
        if [[ "$IMAGE_FILE" == *.gz ]]; then
            echo "Decompressing and restoring to $TARGET_DEV..."
            gunzip -c $IMAGE_DIR/$IMAGE_FILE | dd of=$TARGET_DEV status=progress
        else
            echo "Restoring to $TARGET_DEV..."
            dd if=$IMAGE_DIR/$IMAGE_FILE of=$TARGET_DEV status=progress
        fi
        echo -e "${GREEN}✅ Restore complete!${NC}"
    else
        echo "❌ Image not found: $IMAGE_FILE"
    fi
}

# Main
case "$1" in
    create)
        create_image
        ;;
    app)
        create_app_image
        ;;
    restore)
        restore_image
        ;;
    *)
        echo "NEXUS OS - Disk Image Creator"
        echo ""
        echo "Usage: $0 {create|app|restore}"
        echo ""
        echo "Commands:"
        echo "  create  - Create full disk image (requires root)"
        echo "  app     - Create application image (safer, no root needed)"
        echo "  restore - Restore disk from image (requires root)"
        echo ""
        echo "Examples:"
        echo "  sudo $0 create       # Full disk backup"
        echo "  $0 app               # App-only backup (recommended)"
        echo "  sudo $0 restore      # Restore to disk"
        ;;
esac
