#!/bin/bash

# ==============================================
# EC2 Setup Script for WhatsApp AI Assistant
# ==============================================
# Run this script on a fresh Ubuntu EC2 instance
# Usage: bash setup-ec2.sh
# ==============================================

set -e

echo "=========================================="
echo "WhatsApp AI Assistant - EC2 Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    log_error "Please run this script as a regular user, not root"
    exit 1
fi

# Step 1: Update system
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install dependencies
log_info "Installing dependencies..."
sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    chromium-browser \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# Step 3: Install Node.js 22
log_info "Installing Node.js 22..."
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
log_info "Node.js installed: $node_version"

# Step 4: Install Clawdbot
log_info "Installing Clawdbot..."
if command -v clawdbot &> /dev/null; then
    log_warn "Clawdbot already installed"
else
    curl -fsSL https://clawd.bot/install.sh | bash
fi

# Step 5: Create directory structure
log_info "Setting up workspace directory..."
mkdir -p ~/clawd/{skills,memory,logs,config}

# Step 6: Set environment variables
log_info "Setting up environment variables..."
cat >> ~/.bashrc << 'EOF'

# Clawdbot Environment
export CLAWD_HOME="$HOME/clawd"
export CHROMIUM_PATH="/usr/bin/chromium-browser"
export NODE_ENV="production"
EOF

source ~/.bashrc

# Step 7: Install Node.js dependencies for skills
log_info "Installing Node.js dependencies..."
cd ~/clawd/skills

# Create package.json if not exists
if [ ! -f package.json ]; then
    cat > package.json << 'EOF'
{
  "name": "clawd-skills",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "googleapis": "^134.0.0",
    "puppeteer": "^22.0.0"
  }
}
EOF
fi

npm install

# Step 8: Configure firewall
log_info "Configuring firewall..."
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw allow 18789/tcp # Clawdbot default port
sudo ufw --force enable

# Step 9: Setup systemd service for Clawdbot
log_info "Setting up Clawdbot service..."
sudo tee /etc/systemd/system/clawdbot.service > /dev/null << EOF
[Unit]
Description=Clawdbot WhatsApp AI Assistant
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/clawd
ExecStart=/usr/local/bin/clawdbot start --daemon
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=CLAWD_HOME=$HOME/clawd

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable clawdbot

# Step 10: Create health check script
log_info "Creating health check script..."
mkdir -p ~/clawd/scripts

cat > ~/clawd/scripts/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Clawdbot

check_service() {
    if systemctl is-active --quiet clawdbot; then
        echo "✅ Clawdbot service: Running"
        return 0
    else
        echo "❌ Clawdbot service: Not running"
        return 1
    fi
}

check_memory() {
    mem_available=$(free -m | awk 'NR==2{print $7}')
    if [ "$mem_available" -gt 200 ]; then
        echo "✅ Memory: ${mem_available}MB available"
        return 0
    else
        echo "⚠️ Memory: Low (${mem_available}MB available)"
        return 1
    fi
}

check_disk() {
    disk_usage=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$disk_usage" -lt 80 ]; then
        echo "✅ Disk: ${disk_usage}% used"
        return 0
    else
        echo "⚠️ Disk: ${disk_usage}% used (getting full)"
        return 1
    fi
}

echo "=== Clawdbot Health Check ==="
echo "Time: $(date)"
echo ""
check_service
check_memory
check_disk
echo ""
echo "==========================="
EOF

chmod +x ~/clawd/scripts/health-check.sh

# Step 11: Setup log rotation
log_info "Setting up log rotation..."
sudo tee /etc/logrotate.d/clawdbot > /dev/null << EOF
$HOME/clawd/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
}
EOF

# Done!
echo ""
echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy your credentials.json to ~/clawd/skills/gmail/"
echo "2. Run: clawdbot onboard --install-daemon"
echo "3. Configure Claude auth: clawdbot models auth paste-token --provider anthropic"
echo "4. Pair WhatsApp: clawdbot whatsapp pair"
echo "5. Start the service: sudo systemctl start clawdbot"
echo ""
echo "Useful commands:"
echo "  - Check status: sudo systemctl status clawdbot"
echo "  - View logs: tail -f ~/clawd/logs/clawdbot.log"
echo "  - Health check: ~/clawd/scripts/health-check.sh"
echo ""
log_info "Reboot recommended: sudo reboot"
