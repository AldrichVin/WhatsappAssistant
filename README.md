# Andi — WhatsApp AI Assistant

A fully-featured AI assistant integrated with WhatsApp, powered by Claude API. Automates email management, calendar operations, web research, and arbitrary task execution through a natural chat interface.

## Features

- **Claude API Integration**: Natural language understanding + task planning
- **Gmail API**: Read, search, compose, and send emails with OAuth 2.0
- **Google Calendar API**: Create events, check availability, manage schedules
- **Web Search**: SerpAPI integration for real-world research tasks
- **Browser Automation**: Chromium headless browser for web scraping
- **Multi-User SaaS**: Isolated workspaces per user with secure token storage
- **AWS EC2 Hosting**: Deployed on EC2 with auto-restart on failure

## How It Works

### Architecture

```
WhatsApp Message
       ↓
OpenClaw Gateway (Node.js)
       ↓
Claude API (understands intent)
       ↓
Skill Router (picks the right tool)
       ↓
Execution Layer:
  ├── Gmail API (read/send emails)
  ├── Calendar API (schedule events)
  ├── SerpAPI (web search)
  ├── Chrome Automation (scrape web)
  └── File System (read/write local files)
       ↓
Return Result to WhatsApp
```

### Example Conversations

**Email Management**
```
User: "Summarize my unread emails from this week"
→ Claude plans: Read Gmail, filter by date, summarize
→ Andi returns: Email summaries with senders + dates
```

**Calendar Integration**
```
User: "Schedule a meeting with John next Tuesday at 2 PM"
→ Claude: Parse intent (create event, invite John)
→ Check calendar availability
→ Create event + send invite
→ Confirm to user
```

**Research Tasks**
```
User: "What are the latest trends in AI agents?"
→ Claude: Search web via SerpAPI
→ Rank results by relevance
→ Summarize top 5
→ Return with links
```

**Multi-Step Automation**
```
User: "Send a follow-up email to everyone I met at the conference"
→ Claude: Read calendar events from conference dates
→ Extract attendee emails from emails
→ Generate personalized follow-ups
→ Send via Gmail
→ Confirm completion
```

## Tech Stack

- **Framework**: OpenClaw (Node.js AI agent framework)
- **AI Model**: Claude (via Anthropic API)
- **Messaging**: WhatsApp API (via OpenClaw integration)
- **Email**: Gmail API (OAuth 2.0)
- **Calendar**: Google Calendar API (OAuth 2.0)
- **Search**: SerpAPI (web search)
- **Browser**: Chromium (headless browser automation)
- **Hosting**: AWS EC2 (t3.micro)
- **Auth**: OAuth 2.0 flows for Google APIs

## Project Structure

```
├── skills/
│  ├── gmail-reader/
│  │  └── SKILL.md
│  ├── calendar-manager/
│  │  └── SKILL.md
│  ├── web-search/
│  │  └── SKILL.md
│  └── browser-automation/
│     └── SKILL.md
├── auth/
│  ├── google-oauth.js
│  └── token-storage.js
├── data/
│  └── user-tokens/ (per-user OAuth tokens)
├── index.js (main agent entry)
└── openclaw.json
```

## OAuth 2.0 Flow

```
User Setup:
1. /auth/google-oauth generates authorization URL
2. User clicks, grants permission to Gmail + Calendar
3. OAuth callback stores refresh token securely
4. Andi can now read/send emails indefinitely
```

## Key Implementation Details

**Multi-User Isolation**:
- Each user has isolated workspace (`/data/user-[id]/`)
- OAuth tokens stored encrypted per user
- Email/calendar reads scoped to user's account
- No cross-user data leakage

**Gmail Integration**:
- Uses Gmail API (not IMAP) for reliability
- Implements pagination for large mailboxes
- Caches recent emails to reduce API quota
- Supports labels, threads, and advanced search

**Calendar Integration**:
- Real-time availability checking before scheduling
- Handles timezone conversions
- Supports recurring events
- Sends invitations to attendees

**Browser Automation**:
- Chromium running in headless mode
- Handles JavaScript-heavy sites
- Waits for dynamic content loading
- Extracts structured data (tables, lists, links)

## Learnings

- **OAuth complexity**: Managing token refresh, expiry, and security is non-trivial
- **API quota management**: Gmail/Calendar have rate limits; need caching strategy
- **Natural language → action**: Claude is surprisingly good at task planning
- **Multi-user scaling**: Workspace isolation is critical from day 1
- **WhatsApp as interface**: More natural than traditional dashboards

## Deployment

```bash
# Deploy to EC2
git clone https://github.com/AldrichVin/WhatsappAssistant.git
npm install
export ANTHROPIC_API_KEY=sk-...
export WHATSAPP_PHONE_NUMBER=+1234567890
npm start

# Runs on systemd auto-restart
systemctl status whatsapp-assistant
```

## Limitations & Future Work

**Current Limitations**:
- Single-person use (could extend to teams)
- No voice input (WhatsApp supports audio)
- Limited context memory (could use persistent DB)
- No calendar conflict resolution (just suggests times)

**Future Enhancements**:
- [ ] Voice message support
- [ ] Meeting transcription
- [ ] Slack integration
- [ ] Persistent conversation history
- [ ] Custom skill creation UI
- [ ] Delegation to sub-agents
- [ ] Cost tracking per API call

## Comparison: Andi vs. Other AI Assistants

| Feature | Andi | ChatGPT | Siri | Google Assistant |
|---------|------|---------|------|-----------------|
| WhatsApp Native | ✅ | ❌ | ❌ | ❌ |
| Gmail Integration | ✅ | ❌ | ❌ | ✅ |
| Custom Skills | ✅ | ❌ | Limited | Limited |
| Self-Hosted | ✅ | ❌ | ❌ | ❌ |
| Task Automation | ✅ | Manual | Manual | Limited |

---

**Author**: Aldrich Vincent  
**Status**: Active (2025-present)  
**Repository**: https://github.com/AldrichVin/WhatsappAssistant
