---
name: calendar
description: Manage Google Calendar events and reminders
version: 1.0.0
metadata:
  clawdbot:
    requires:
      bins: ["node"]
    elevated: false
---

# Calendar Skill

This skill allows managing Google Calendar events, setting reminders, and scheduling.

## Setup Required

User must complete Google Calendar OAuth once. The bot will guide through this process.

### OAuth Scopes Needed
- `https://www.googleapis.com/auth/calendar.readonly` - Read events
- `https://www.googleapis.com/auth/calendar.events` - Create/modify events

## Commands

### today
Show today's events.

**Parameters:**
- `timezone` (optional): Timezone (default: Asia/Jakarta)

**Example:**
```
User: "Jadwal hari ini apa?"
Bot: Calls today(timezone="Asia/Jakarta")
```

### tomorrow
Show tomorrow's events.

**Parameters:**
- `timezone` (optional): Timezone (default: Asia/Jakarta)

### week
Show this week's events.

**Parameters:**
- `start_day` (optional): Start of week (default: today)
- `timezone` (optional): Timezone

**Example:**
```
User: "Minggu ini ada apa aja?"
Bot: Calls week()
```

### get_event
Get details of a specific event.

**Parameters:**
- `event_id` (required): Event ID

### add_event
Create a new calendar event (requires confirmation).

**Parameters:**
- `title` (required): Event title
- `start_time` (required): Start datetime
- `end_time` (optional): End datetime (default: +1 hour)
- `description` (optional): Event description
- `location` (optional): Event location
- `attendees` (optional): List of email addresses
- `reminder` (optional): Minutes before to remind (default: 15)

**Safety:**
- ALWAYS show event preview before creating
- ALWAYS require explicit confirmation
- Check for conflicts with existing events

**Example:**
```
User: "Jadwalin meeting sama tim jam 3"
Bot: Shows preview, asks for confirmation
User: "Oke"
Bot: Calls add_event(title="Meeting dengan Tim", start_time="15:00", ...)
```

### update_event
Update an existing event (requires confirmation).

**Parameters:**
- `event_id` (required): Event ID
- `title` (optional): New title
- `start_time` (optional): New start time
- `end_time` (optional): New end time
- `description` (optional): New description

### delete_event
Delete an event (requires confirmation).

**Parameters:**
- `event_id` (required): Event ID

**Safety:**
- ALWAYS show event details before deletion
- ALWAYS require explicit "hapus" or "delete" confirmation

### set_reminder
Set a reminder for a specific time (uses cron).

**Parameters:**
- `message` (required): Reminder message
- `time` (required): When to remind
- `repeat` (optional): none/daily/weekly/monthly

**Example:**
```
User: "Ingetin aku meeting jam 3"
Bot: Calls set_reminder(message="Meeting", time="14:45")
```

### list_reminders
Show active reminders.

### cancel_reminder
Cancel a scheduled reminder.

**Parameters:**
- `reminder_id` (required): Reminder ID

## Response Format

### Today's Schedule
```
📅 Jadwal Hari Ini (Senin, 26 Jan 2024)

🕘 09:00 - 10:00
   Daily Standup
   📍 Zoom (link di deskripsi)

🕐 13:00 - 14:00
   Lunch Meeting dengan Client
   📍 Restoran XYZ, Sudirman

🕓 15:00 - 16:30
   Review Project Alpha
   👥 Tim Development

📌 Reminder aktif:
   • 14:45 - Reminder meeting jam 3

---
Total: 3 event hari ini
Free time: 10:00-13:00, 16:30+
```

### Event Created
```
✅ Event berhasil dibuat!

📅 Meeting dengan Tim
🕐 Senin, 26 Jan 2024, 15:00-16:00
📍 Ruang Meeting A
⏰ Reminder: 15 menit sebelumnya

Ada yang perlu ditambahkan?
```

### Conflict Warning
```
⚠️ Sepertinya ada jadwal bentrok:

Event baru: Meeting jam 15:00-16:00
Bentrok dengan: Call dengan Client (15:30-16:30)

Mau tetap buat? Atau ganti waktu?
```

## Time Parsing

The skill understands Indonesian time expressions:
- "jam 3" → 15:00
- "jam 3 sore" → 15:00
- "jam 3 pagi" → 03:00
- "besok" → tomorrow
- "lusa" → day after tomorrow
- "minggu depan" → next week
- "tanggal 25" → specific date

## Cron Integration

For reminders, this skill integrates with Clawdbot's cron system:
```json
{
  "cron": {
    "reminder_123": {
      "schedule": "45 14 26 1 *",
      "action": "send_message",
      "payload": {
        "channel": "whatsapp",
        "to": "+62812xxx",
        "message": "⏰ Reminder: Meeting dalam 15 menit!"
      }
    }
  }
}
```

## Error Handling

### Not Authenticated
```
⚠️ Google Calendar belum terhubung.

Untuk menghubungkan, klik link ini:
[OAuth Link]

Setelah selesai, bilang "sudah" ya!
```

### No Events
```
📅 Jadwal hari ini kosong!
Mau bikin jadwal baru?
```

### Event Not Found
```
🤔 Event tidak ditemukan.
Mungkin sudah dihapus atau bukan di kalender utama?
```

## Files
- `calendar-tools.js` - Google Calendar API wrapper
- `credentials.json` - OAuth credentials (shared with Gmail)
- `token.json` - User auth token (shared with Gmail)
