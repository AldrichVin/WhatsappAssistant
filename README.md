# WhatsApp AI Assistant (Andi)

A WhatsApp-based AI assistant for Indonesian users, built on Clawdbot. Features email management, calendar scheduling, and food ordering capabilities.

## Features

- **Email Management** - Check, read, and reply to emails via Gmail
- **Calendar Integration** - View and create events, set reminders
- **Food Ordering** - Order from GrabFood (via browser automation)
- **Indonesian Language** - Native support for Bahasa Indonesia
- **Multi-user SaaS** - Scale to thousands of users

## Quick Start

### Prerequisites

- Ubuntu 22.04+ (recommended: AWS EC2 t2.micro for free tier)
- Node.js 18+
- Chromium browser (for GrabFood automation)
- Claude Pro/Max subscription or API key
- Google Cloud account (for Gmail/Calendar APIs)

### Installation

1. **Clone and setup on EC2:**

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Run setup script
curl -fsSL https://raw.githubusercontent.com/your-repo/clawd/main/scripts/setup-ec2.sh | bash
```

2. **Install Clawdbot:**

```bash
curl -fsSL https://clawd.bot/install.sh | bash
clawdbot onboard --install-daemon
```

3. **Configure Claude authentication:**

```bash
# Using Claude subscription
clawdbot models auth paste-token --provider anthropic
```

4. **Pair WhatsApp:**

```bash
clawdbot whatsapp pair
# Scan QR code with your phone
```

5. **Setup Google OAuth:**

```bash
# Place credentials.json in skills/gmail/
node scripts/oauth-server.js
# Open http://your-server:3000 and complete OAuth
```

## Project Structure

```
clawd/
├── AGENTS.md           # Main agent instructions
├── SOUL.md             # Bot personality (Indonesian)
├── USER.md             # User preferences template
├── MEMORY.md           # Long-term memory
├── package.json        # Node.js dependencies
├── config/
│   ├── clawdbot.json   # Main configuration
│   └── multi-user.json # Multi-user routing
├── skills/
│   ├── gmail/
│   │   ├── SKILL.md          # Gmail skill definition
│   │   ├── gmail-tools.js    # Gmail API wrapper
│   │   └── credentials.json  # (DO NOT COMMIT)
│   ├── calendar/
│   │   ├── SKILL.md          # Calendar skill definition
│   │   └── calendar-tools.js # Calendar API wrapper
│   └── grab-food/
│       ├── SKILL.md          # GrabFood skill definition
│       ├── grab-automation.js # Browser automation
│       └── selectors.json    # UI selectors
├── scripts/
│   ├── setup-ec2.sh    # EC2 setup script
│   └── oauth-server.js # Google OAuth server
├── memory/             # Auto-managed daily notes
└── logs/               # Application logs
```

## Configuration

### Clawdbot Config (`config/clawdbot.json`)

Key settings:

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allowFrom": ["+628123456789"]  // Allowed phone numbers
    }
  },
  "models": {
    "default": "claude-3-5-sonnet"
  },
  "skills": {
    "enabled": ["gmail", "calendar", "grab-food"]
  }
}
```

### Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Gmail API and Google Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Download credentials and save as `skills/gmail/credentials.json`
5. Run OAuth server and complete authorization

## Usage Examples

### Email

```
User: Cek email
Bot: 📬 Ada 5 email baru:
     1. [Penting] Meeting reminder dari boss
     ...

User: Baca nomor 1
Bot: 📧 Email dari boss@company.com
     Subject: Meeting reminder
     ...
```

### Calendar

```
User: Jadwal hari ini apa?
Bot: 📅 Jadwal Hari Ini:
     🕘 09:00 - Daily Standup
     🕐 13:00 - Lunch Meeting
     ...

User: Jadwalin meeting jam 3 sama tim
Bot: ✅ Event berhasil dibuat!
     📅 Meeting jam 15:00-16:00
```

### Food Ordering

```
User: Pesen nasi goreng
Bot: 🍽️ Ini beberapa pilihan:
     1. Warung Pak Eko ⭐4.8
     2. Nasi Goreng Gila ⭐4.5
     ...

User: Pilih nomor 1, nasi goreng spesial 2
Bot: 📋 Ringkasan Pesanan:
     2x Nasi Goreng Spesial - Rp 50.000
     Ongkir - Rp 8.000
     TOTAL - Rp 58.000

     Ketik 'pesan' untuk konfirmasi
```

## Multi-User Setup

For SaaS deployment with multiple users:

1. Configure `config/multi-user.json` with user routing rules
2. Each user gets their own workspace directory
3. Implement onboarding flow for new users
4. Consider billing integration for monetization

## Security Notes

- **Never commit** `credentials.json`, `token.json`, or `.env` files
- User data is isolated per workspace
- All payment actions require explicit confirmation
- Rate limiting is enabled by default

## Troubleshooting

### WhatsApp not connecting
```bash
# Re-pair WhatsApp
clawdbot whatsapp unpair
clawdbot whatsapp pair
```

### Gmail authentication expired
```bash
# Re-run OAuth server
node scripts/oauth-server.js
# Complete re-authorization
```

### GrabFood automation broken
- UI selectors may have changed
- Update `skills/grab-food/selectors.json`
- Check browser console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- [Clawdbot](https://clawd.bot) - WhatsApp integration platform
- [Anthropic Claude](https://anthropic.com) - AI model
- [Google APIs](https://developers.google.com) - Gmail & Calendar
