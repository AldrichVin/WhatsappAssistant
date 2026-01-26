---
name: onboarding
description: Handle new user registration and setup
version: 1.0.0
metadata:
  clawdbot:
    priority: high
    trigger: new_user
---

# User Onboarding Skill

Handles the registration and setup flow for new users.

## Trigger Conditions

This skill activates when:
- New phone number messages the bot (not in users database)
- User is in "pending" status
- User requests to setup/connect services

## Onboarding Flow

### Step 1: Welcome & Registration

**Trigger**: New phone number detected

**Bot Response**:
```
Halo! 👋

Selamat datang di Andi, asisten AI pribadi kamu.

Untuk memulai, aku perlu verifikasi dulu ya.
Kode verifikasi kamu: **ABC123**

Balas dengan kode tersebut untuk konfirmasi.

(Kode berlaku 15 menit)
```

### Step 2: Verification

**User**: `ABC123`

**Bot Response**:
```
✅ Verifikasi berhasil!

Sekarang, boleh tau nama kamu siapa?
```

### Step 3: Name Collection

**User**: `Budi`

**Bot Response**:
```
Hai Budi! Senang berkenalan! 🙌

Kamu sekarang pakai paket FREE:
• 50 pesan per hari
• Fitur: Kalender & Pengingat

Mau upgrade ke Premium untuk akses Gmail?
Ketik "upgrade" untuk info lebih lanjut.

---

Sekarang, mau hubungkan Google Calendar?
Dengan ini aku bisa bantu kelola jadwal kamu.

Ketik "hubungkan calendar" atau "skip" untuk nanti.
```

### Step 4: Service Connection (Optional)

**User**: `hubungkan calendar`

**Bot Response**:
```
Oke! Klik link ini untuk hubungkan Google Calendar:

🔗 https://your-server.com/oauth?user=USER_ID&service=calendar

Setelah selesai, bilang "sudah" ya!
```

**User**: `sudah`

**Bot Response**:
```
✅ Google Calendar terhubung!

Sekarang aku bisa:
• Lihat jadwal kamu
• Buat event baru
• Ingatkan sebelum meeting

---

Setup selesai! 🎉

Beberapa hal yang bisa kamu coba:
• "Jadwal hari ini" - lihat agenda
• "Ingatkan aku jam 3" - set pengingat
• "Bantuan" - lihat semua fitur

Ada yang bisa aku bantu?
```

## Commands

### start_onboarding
Initiate onboarding for new user.

**Parameters:**
- `phone` (required): User's WhatsApp number

**Returns:**
- `pairing_code`: 6-character verification code
- `expires_at`: Code expiration time

### verify_code
Verify the pairing code.

**Parameters:**
- `phone` (required): User's phone number
- `code` (required): Verification code

**Returns:**
- `success`: boolean
- `user_id`: New user ID (if successful)

### set_name
Set user's display name.

**Parameters:**
- `user_id` (required): User ID
- `name` (required): Display name

### connect_service
Generate OAuth link for service connection.

**Parameters:**
- `user_id` (required): User ID
- `service` (required): 'gmail' | 'calendar'

**Returns:**
- `oauth_url`: URL for OAuth flow

### complete_setup
Mark onboarding as complete.

**Parameters:**
- `user_id` (required): User ID

## Response Templates

### Welcome (Indonesian)
```
Halo! 👋

Selamat datang di Andi, asisten AI pribadi kamu.

Aku bisa bantu kamu dengan:
📅 Jadwal & Pengingat
📧 Email (Premium)
🍔 Pesan Makanan (Business)

Untuk memulai, aku kirim kode verifikasi ya.
Kode kamu: **{CODE}**

Balas dengan kode tersebut.
```

### Welcome (English)
```
Hello! 👋

Welcome to Andi, your personal AI assistant.

I can help you with:
📅 Schedule & Reminders
📧 Email (Premium)
🍔 Food Ordering (Business)

To get started, I'll send you a verification code.
Your code: **{CODE}**

Reply with the code to continue.
```

### Verification Success
```
✅ Verifikasi berhasil!

Halo {NAME}! Akun kamu sudah aktif.

Paket: {PLAN}
Fitur: {FEATURES}

Ketik "bantuan" untuk lihat apa yang bisa aku bantu.
```

### Rate Limit Warning
```
⚠️ Kamu sudah mencapai batas pesan hari ini ({COUNT}/{LIMIT}).

Batas akan reset besok jam 00:00 WIB.

Mau upgrade ke Premium untuk lebih banyak pesan?
Ketik "upgrade" untuk info.
```

### Plan Comparison
```
📊 Perbandingan Paket:

FREE (Gratis)
• 50 pesan/hari
• Kalender & Pengingat
• Bantuan komunitas

PREMIUM (Rp 49.000/bulan)
• 500 pesan/hari
• + Gmail integration
• + Daily briefing
• Bantuan prioritas

BUSINESS (Rp 149.000/bulan)
• Unlimited pesan
• + Semua fitur Premium
• + Pesan makanan (GrabFood)
• + Personality kustom
• Bantuan dedicated

Mau upgrade? Ketik "upgrade premium" atau "upgrade business"
```

## Error Handling

### Invalid Code
```
❌ Kode tidak valid.

Pastikan kamu memasukkan kode yang benar.
Kode kamu: **{CODE}**

Atau ketik "kode baru" untuk minta kode baru.
```

### Code Expired
```
⏰ Kode sudah kadaluarsa.

Ketik "kode baru" untuk minta kode verifikasi baru.
```

### Already Registered
```
👋 Hai! Sepertinya kamu sudah terdaftar.

Kalau ada masalah dengan akun, ketik "bantuan akun".
```

## Integration

This skill integrates with:
- `scripts/user-management.js` - User database operations
- `scripts/oauth-server.js` - OAuth flow handling
- `config/multi-user.json` - Routing updates
