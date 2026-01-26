---
name: gmail
description: Check and manage Gmail inbox
version: 1.0.0
metadata:
  clawdbot:
    requires:
      bins: ["node"]
    elevated: false
---

# Gmail Skill

This skill allows checking emails, summarizing inbox, and drafting replies.

## Setup Required

User must complete Gmail OAuth once. The bot will guide through this process.

### OAuth Scopes Needed
- `https://www.googleapis.com/auth/gmail.readonly` - Read emails
- `https://www.googleapis.com/auth/gmail.send` - Send emails
- `https://www.googleapis.com/auth/gmail.modify` - Modify labels/read status

## Commands

### check_emails
List recent emails from inbox.

**Parameters:**
- `count` (optional): Number of emails to fetch (default: 10, max: 50)
- `unread_only` (optional): Only show unread emails (default: false)
- `from` (optional): Filter by sender

**Example:**
```
User: "Cek email"
Bot: Calls check_emails(count=10, unread_only=false)
```

### read_email
Read a specific email's full content.

**Parameters:**
- `email_id` (required): The email ID from check_emails result

**Example:**
```
User: "Baca email nomor 1"
Bot: Calls read_email(email_id="...")
```

### search_emails
Search emails with query.

**Parameters:**
- `query` (required): Search query (Gmail search syntax)
- `count` (optional): Max results (default: 10)

**Example:**
```
User: "Cari email dari boss minggu lalu"
Bot: Calls search_emails(query="from:boss after:2024/01/20")
```

### draft_reply
Draft a reply to an email.

**Parameters:**
- `email_id` (required): Original email ID
- `message` (required): Reply content
- `tone` (optional): formal/casual (default: based on original)

**Example:**
```
User: "Balas email itu, bilang oke"
Bot: Calls draft_reply(email_id="...", message="Baik, terima kasih...")
```

### send_email
Send an email (requires explicit confirmation).

**Parameters:**
- `to` (required): Recipient email
- `subject` (required): Email subject
- `body` (required): Email body
- `draft_id` (optional): Send existing draft

**Safety:**
- ALWAYS show preview before sending
- ALWAYS require "kirim" or "send" confirmation
- Log all sent emails

## Response Format

### Email List
```
📬 Inbox kamu (5 email baru):

1. [⭐ Penting] Meeting Update
   Dari: boss@company.com
   Waktu: 10 menit lalu
   Preview: "Tolong review dokumen yang..."

2. Newsletter Tokopedia
   Dari: newsletter@tokopedia.com
   Waktu: 1 jam lalu
   Preview: "Promo spesial hari ini..."

Mau baca yang mana? (balas dengan nomor)
```

### Single Email
```
📧 Email dari boss@company.com

Subject: Meeting Update
Tanggal: 26 Jan 2024, 10:30 WIB

---
[Email content here]
---

Mau balas? Atau ada yang lain?
```

## Error Handling

### Not Authenticated
```
⚠️ Gmail belum terhubung.

Untuk menghubungkan Gmail, klik link ini:
[OAuth Link]

Setelah selesai, bilang "sudah" ya!
```

### Rate Limited
```
⏳ Waduh, Gmail lagi sibuk nih.
Coba lagi dalam beberapa menit ya.
```

### Email Not Found
```
🤔 Email tidak ditemukan.
Mungkin sudah dihapus atau diarsip?
```

## Files
- `gmail-tools.js` - Gmail API wrapper functions
- `credentials.json` - OAuth credentials (DO NOT COMMIT)
- `token.json` - User auth token (DO NOT COMMIT)
