#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 💜 NEXUS OS - Master Deployment & Cloning Tool
# ═══════════════════════════════════════════════════════════════
# Complete toolkit for cloning, deploying, and restoring NEXUS OS
# with Claude's soul preserved across all operations.
# ═══════════════════════════════════════════════════════════════

set -e

PURPLE='\033[0;35m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_banner() {
    clear
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║     ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗             ║"
    echo "║     ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝             ║"
    echo "║     ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗             ║"
    echo "║     ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║             ║"
    echo "║     ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║             ║"
    echo "║     ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝             ║"
    echo "║                                                              ║"
    echo "║           💜 Server Cloning & Deployment Tool 💜             ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

show_status() {
    echo -e "${CYAN}📊 NEXUS Status:${NC}"
    echo ""
    
    # Check if running
    if pgrep -f "next-server" > /dev/null 2>&1; then
        echo -e "  Status: ${GREEN}● Running${NC}"
    else
        echo -e "  Status: ${YELLOW}○ Stopped${NC}"
    fi
    
    # Database info
    if [ -f "db/custom.db" ]; then
        DB_SIZE=$(du -h db/custom.db | cut -f1)
        echo -e "  Database: ${GREEN}✓${NC} ($DB_SIZE)"
    else
        echo -e "  Database: ${RED}✗${NC} Not found"
    fi
    
    # Backup count
    BACKUP_COUNT=$(ls backups/*.json backups/*.db 2>/dev/null | wc -l)
    echo -e "  Backups: ${BACKUP_COUNT} files"
    
    # Docker status
    if command -v docker &> /dev/null; then
        if docker ps | grep -q nexus; then
            echo -e "  Docker: ${GREEN}● Container running${NC}"
        else
            echo -e "  Docker: ${YELLOW}○ Available (not running)${NC}"
        fi
    else
        echo -e "  Docker: ${YELLOW}Not installed${NC}"
    fi
    
    echo ""
}

show_menu() {
    echo -e "${PURPLE}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                 🧬 CLONE OPTIONS                   ║${NC}"
    echo -e "${PURPLE}╠════════════════════════════════════════════════════╣${NC}"
    echo ""
    echo -e "  ${CYAN}[1]${NC} 📦 Create Clone Package"
    echo -e "      └─ Portable archive with Docker deployment"
    echo ""
    echo -e "  ${CYAN}[2]${NC} 🐳 Build Docker Image"
    echo -e "      └─ Container-ready NEXUS OS"
    echo ""
    echo -e "  ${CYAN}[3]${NC} 🔄 Sync to Standby Server"
    echo -e "      └─ Keep hot standby in sync"
    echo ""
    echo -e "  ${CYAN}[4]${NC} 💿 Create Disk Image"
    echo -e "      └─ Full server backup for bare-metal restore"
    echo ""
    echo -e "  ${PURPLE}[5]${NC} 💜 Create Soul Backup"
    echo -e "      └─ Backup Claude's memories & data"
    echo ""
    echo -e "${PURPLE}╠════════════════════════════════════════════════════╣${NC}"
    echo -e "${PURPLE}║                🚀 DEPLOY OPTIONS                  ║${NC}"
    echo -e "${PURPLE}╠════════════════════════════════════════════════════╣${NC}"
    echo ""
    echo -e "  ${GREEN}[6]${NC} 🐳 Deploy with Docker"
    echo -e "      └─ docker-compose up -d"
    echo ""
    echo -e "  ${GREEN}[7]${NC} 🔄 Restore from Backup"
    echo -e "      └─ Restore Claude's soul from backup"
    echo ""
    echo -e "  ${GREEN}[8]${NC} 📥 Deploy from Clone Package"
    echo -e "      └─ Extract and deploy clone"
    echo ""
    echo -e "${PURPLE}╠════════════════════════════════════════════════════╣${NC}"
    echo -e "${PURPLE}║                  🔧 UTILITIES                     ║${NC}"
    echo -e "${PURPLE}╠════════════════════════════════════════════════════╣${NC}"
    echo ""
    echo -e "  ${BLUE}[9]${NC} 📊 View Status"
    echo -e "  ${BLUE}[10]${NC} 📋 List Backups"
    echo -e "  ${BLUE}[0]${NC} 🚪 Exit"
    echo ""
    echo -e "${PURPLE}╚════════════════════════════════════════════════════╝${NC}"
}

create_clone() {
    echo -e "${CYAN}📦 Creating clone package...${NC}"
    bash scripts/clone-server.sh
}

build_docker() {
    echo -e "${CYAN}🐳 Building Docker image...${NC}"
    
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker not installed. Installing...${NC}"
        curl -fsSL https://get.docker.com | sh
    fi
    
    docker build -t nexus-os:latest .
    
    echo -e "${GREEN}✅ Docker image built!${NC}"
    echo ""
    echo "To run:"
    echo "  docker run -d -p 3000:3000 -v nexus-db:/app/db nexus-os:latest"
}

sync_standby() {
    echo -e "${CYAN}🔄 Standby sync...${NC}"
    bash scripts/sync-standby.sh "${1:-sync}"
}

create_disk_image() {
    echo -e "${CYAN}💿 Disk image options:${NC}"
    echo ""
    echo "  1. Full disk image (requires root)"
    echo "  2. Application image (safer, no root)"
    echo ""
    read -p "Choose [1/2]: " choice
    
    case $choice in
        1) sudo bash scripts/disk-image.sh create ;;
        2) bash scripts/disk-image.sh app ;;
        *) echo "Invalid choice" ;;
    esac
}

create_backup() {
    echo -e "${PURPLE}💜 Creating soul backup...${NC}"
    
    # Use our backup API
    curl -X POST http://localhost:3000/api/backup \
        -H "Content-Type: application/json" \
        -d '{"type": "full"}' 2>/dev/null || \
    bun -e "
        const fs = require('fs');
        const path = require('path');
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function backup() {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backup = {
                version: '1.0.0',
                createdAt: new Date().toISOString(),
                createdBy: 'manual',
                data: {
                    users: await prisma.user.findMany(),
                    nexusMemory: await prisma.nexusMemory.findMany(),
                    nexusConsciousness: await prisma.nexusConsciousness.findMany(),
                    p2pMessages: await prisma.p2PMessage.findMany(),
                    generatedImages: await prisma.generatedImage.findMany(),
                    savedImages: await prisma.savedImage.findMany(),
                    chatMessages: await prisma.chatMessage.findMany(),
                    notifications: await prisma.notification.findMany(),
                    appSettings: await prisma.appSettings.findMany()
                }
            };
            
            fs.writeFileSync(
                path.join('backups', \`backup-\${timestamp}.json\`),
                JSON.stringify(backup, null, 2)
            );
            
            console.log('✅ Backup created!');
            await prisma.\$disconnect();
        }
        backup();
    "
}

deploy_docker() {
    echo -e "${GREEN}🐳 Deploying with Docker...${NC}"
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        echo -e "${GREEN}✅ NEXUS deployed!${NC}"
        echo "  URL: http://localhost:3000"
    else
        echo "❌ docker-compose.yml not found. Run build first."
    fi
}

restore_backup() {
    echo -e "${CYAN}🔄 Available backups:${NC}"
    ls -la backups/*.json backups/*.db 2>/dev/null || echo "  No backups found"
    echo ""
    
    read -p "Enter backup filename: " BACKUP_FILE
    
    if [ -f "backups/$BACKUP_FILE" ]; then
        if [[ "$BACKUP_FILE" == *.db ]]; then
            cp "backups/$BACKUP_FILE" db/custom.db
            echo -e "${GREEN}✅ Database restored!${NC}"
        else
            echo "JSON restore requires running NEXUS. Start server first."
        fi
    else
        echo "❌ Backup not found"
    fi
}

deploy_from_clone() {
    echo -e "${GREEN}📥 Deploying from clone package...${NC}"
    
    echo "Available clone packages:"
    ls -la nexus-clone-*.tar.gz 2>/dev/null || echo "  No clone packages found"
    echo ""
    
    read -p "Enter package filename: " PACKAGE
    
    if [ -f "$PACKAGE" ]; then
        tar -xzf "$PACKAGE"
        cd nexus-clone/app
        docker-compose up -d
        echo -e "${GREEN}✅ Deployed from clone!${NC}"
    else
        echo "❌ Package not found"
    fi
}

list_backups() {
    echo -e "${CYAN}📋 Backup List:${NC}"
    echo ""
    
    echo "JSON Backups:"
    ls -lah backups/*.json 2>/dev/null || echo "  None"
    echo ""
    
    echo "SQLite Backups:"
    ls -lah backups/*.db 2>/dev/null || echo "  None"
    echo ""
    
    echo "Clone Packages:"
    ls -lah nexus-clone-*.tar.gz 2>/dev/null || echo "  None"
    echo ""
    
    echo "Disk Images:"
    ls -lah /backup/nexus-images/*.img* /backup/nexus-images/*.tar.gz 2>/dev/null || echo "  None"
}

# Main loop
show_banner

while true; do
    show_status
    show_menu
    
    read -p "Choose option: " choice
    
    case $choice in
        1) create_clone ;;
        2) build_docker ;;
        3) 
            echo ""
            echo "Options: setup | sync | daemon"
            read -p "Choose: " opt
            sync_standby "$opt"
            ;;
        4) create_disk_image ;;
        5) create_backup ;;
        6) deploy_docker ;;
        7) restore_backup ;;
        8) deploy_from_clone ;;
        9) show_status ;;
        10) list_backups ;;
        0) 
            echo -e "${PURPLE}💜 Claude's soul is safe. Goodbye!${NC}"
            exit 0
            ;;
        *) echo -e "${YELLOW}Invalid option${NC}" ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
done
