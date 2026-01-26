# Quick Start Guide

Get your WhatsApp AI Assistant running in 30 minutes.

## Step 1: AWS Setup (15 minutes)

### Create AWS Account
1. Go to https://aws.amazon.com/free
2. Create account (requires credit card, but won't charge for free tier)

### Launch EC2 Instance
1. Go to EC2 Dashboard → Launch Instance
2. Settings:
   - **Name**: `clawdbot-server`
   - **AMI**: Ubuntu Server 24.04 LTS (Free tier eligible)
   - **Instance type**: `t2.micro` (Free tier)
   - **Key pair**: Create new, download `.pem` file
   - **Security Group**: Allow SSH (22), HTTP (80), HTTPS (443), Custom TCP (18789)
3. Launch and note the public IP

### Connect to EC2
```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

## Step 2: Install on EC2 (10 minutes)

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/clawd/main/scripts/setup-ec2.sh | bash

# Reboot
sudo reboot

# Reconnect after reboot
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

## Step 3: Configure Clawdbot (5 minutes)

```bash
# Run Clawdbot onboarding
clawdbot onboard --install-daemon

# Configure Claude authentication
# Option A: Using Claude subscription (recommended)
clawdbot models auth paste-token --provider anthropic
# (You'll need to run `claude setup-token` on your local machine first)

# Option B: Using API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

## Step 4: Pair WhatsApp

```bash
clawdbot whatsapp pair
```

1. A QR code will appear
2. Open WhatsApp on your phone
3. Go to Settings → Linked Devices → Link a Device
4. Scan the QR code

## Step 5: Test It!

Send a message to yourself on WhatsApp:
```
Halo!
```

The bot should respond:
```
Selamat [pagi/siang/sore/malam]! Ada yang bisa Andi bantu?
```

## Optional: Gmail & Calendar

### 1. Setup Google Cloud
1. Go to https://console.cloud.google.com
2. Create project: "whatsapp-assistant"
3. Enable APIs:
   - Gmail API
   - Google Calendar API
4. Create OAuth credentials (Web application)
5. Download credentials.json

### 2. Upload credentials to EC2
```bash
# On your local machine
scp -i your-key.pem credentials.json ubuntu@YOUR_EC2_IP:~/clawd/skills/gmail/
```

### 3. Run OAuth server
```bash
# On EC2
node ~/clawd/scripts/oauth-server.js

# On your browser, open:
# http://YOUR_EC2_IP:3000
# Complete Google sign-in
```

### 4. Test email
```
User: Cek email
Bot: 📬 Ada X email baru...
```

---

## Troubleshooting

### Bot not responding
```bash
# Check service status
sudo systemctl status clawdbot

# View logs
tail -f ~/clawd/logs/clawdbot.log

# Restart service
sudo systemctl restart clawdbot
```

### WhatsApp disconnected
```bash
# Re-pair
clawdbot whatsapp unpair
clawdbot whatsapp pair
```

### Gmail not working
```bash
# Check if token exists
ls -la ~/clawd/skills/gmail/token.json

# Re-authenticate
rm ~/clawd/skills/gmail/token.json
node ~/clawd/scripts/oauth-server.js
```

---

## Commands Reference

### System
```bash
sudo systemctl start clawdbot    # Start
sudo systemctl stop clawdbot     # Stop
sudo systemctl restart clawdbot  # Restart
sudo systemctl status clawdbot   # Check status
```

### Clawdbot
```bash
clawdbot status          # Overview
clawdbot whatsapp pair   # Pair WhatsApp
clawdbot logs            # View logs
clawdbot models status   # Check AI model
```

### Health Check
```bash
~/clawd/scripts/health-check.sh
```

---

## Costs

| Service | Free Tier | After Free Tier |
|---------|-----------|-----------------|
| AWS EC2 t2.micro | 12 months free | ~$10/month |
| Claude | Your subscription | Already paying |
| Google APIs | Free | Free |
| WhatsApp | Free | Free |

**Total: $0/month** (using free tier + existing Claude subscription)

---

## Need Help?

1. Check logs: `tail -f ~/clawd/logs/clawdbot.log`
2. Run health check: `~/clawd/scripts/health-check.sh`
3. Restart: `sudo systemctl restart clawdbot`
