---
name: job-search
description: Search for jobs and draft applications on LinkedIn and Indeed
version: 1.0.0
metadata:
  clawdbot:
    requires:
      bins: ["node", "chromium"]
    elevated: true
---

# Job Search & Application Skill

This skill searches for jobs on LinkedIn and Indeed, matches them to your profile, and drafts applications for your review.

## Features

- Search jobs by keywords, location, experience level
- Match jobs to your resume/skills
- Draft cover letters and application responses
- Send job alerts via WhatsApp
- Track application status

## Setup Required

### 1. Resume Upload
Place your resume in the workspace:
- `~/clawd/data/resume.pdf` - PDF version
- `~/clawd/data/resume.json` - Parsed structured data

### 2. LinkedIn Login (Optional)
For LinkedIn Easy Apply, you need to be logged in:
- Bot will use browser automation
- Manual login required once

### 3. Indeed Account (Optional)
For Indeed applications:
- Create Indeed account
- Login via automated browser once

## Commands

### search_jobs
Search for jobs matching criteria.

**Parameters:**
- `keywords` (required): Job title or keywords (e.g., "software engineer", "data analyst")
- `location` (optional): City or "remote" (default: Indonesia)
- `experience` (optional): entry/mid/senior (default: any)
- `posted` (optional): 24h/week/month (default: week)
- `platforms` (optional): linkedin/indeed/both (default: both)

**Example:**
```
User: "Cariin lowongan data analyst di Jakarta"
Bot: Calls search_jobs(keywords="data analyst", location="Jakarta")
```

### get_job_details
Get full details of a specific job.

**Parameters:**
- `job_id` (required): Job ID from search results

**Example:**
```
User: "Lihat detail lowongan nomor 3"
Bot: Calls get_job_details(job_id="...")
```

### draft_application
Draft a cover letter/application for a job.

**Parameters:**
- `job_id` (required): Job ID
- `customize` (optional): Additional notes for customization

**Returns:**
- Drafted cover letter
- Suggested answers for common questions
- Match score with your resume

**Example:**
```
User: "Buatkan lamaran untuk lowongan nomor 3"
Bot: Calls draft_application(job_id="...")
```

### save_application
Save a drafted application for later submission.

**Parameters:**
- `job_id` (required): Job ID
- `draft_id` (required): Draft ID
- `status` (optional): draft/ready/submitted

### submit_application
Submit an application (requires confirmation).

**Parameters:**
- `job_id` (required): Job ID
- `draft_id` (required): Approved draft ID

**Safety:**
- ALWAYS show application preview first
- ALWAYS require explicit "kirim" or "submit" confirmation
- Log all submissions

### set_job_alert
Set up automatic job alerts.

**Parameters:**
- `keywords` (required): Job keywords
- `location` (optional): Location filter
- `frequency` (optional): daily/weekly (default: daily)

**Example:**
```
User: "Kabari aku kalau ada lowongan frontend developer remote"
Bot: Calls set_job_alert(keywords="frontend developer", location="remote", frequency="daily")
```

### list_applications
Show all tracked applications.

**Parameters:**
- `status` (optional): all/draft/submitted/interviewing

### update_resume
Update stored resume data.

**Parameters:**
- `section` (optional): skills/experience/education/all
- `data` (required): Updated information

## Response Formats

### Job Search Results
```
🔍 Lowongan "Data Analyst" di Jakarta

1. **Data Analyst** - Tokopedia
   📍 Jakarta Selatan | 💰 Rp 15-25 juta
   🏢 Full-time | 📅 Posted 2 hari lalu
   ⭐ Match: 85% dengan profil kamu
   🔗 LinkedIn

2. **Junior Data Analyst** - Gojek
   📍 Jakarta / Remote | 💰 Rp 12-18 juta
   🏢 Full-time | 📅 Posted 5 hari lalu
   ⭐ Match: 78% dengan profil kamu
   🔗 Indeed

3. **Business Data Analyst** - Shopee
   📍 Jakarta Barat | 💰 Negotiable
   🏢 Full-time | 📅 Posted 1 minggu lalu
   ⭐ Match: 72% dengan profil kamu
   🔗 LinkedIn

───────────────────
Ketik nomor untuk lihat detail
Ketik "lamar [nomor]" untuk draft lamaran
```

### Job Details
```
📋 **Data Analyst - Tokopedia**

🏢 Company: Tokopedia (E-commerce)
📍 Location: Jakarta Selatan
💰 Salary: Rp 15-25 juta/bulan
🏢 Type: Full-time
📅 Posted: 2 hari lalu
👥 Applicants: 50-100

**Requirements:**
• Bachelor's degree in Statistics, Math, or related
• 2+ years experience in data analysis
• Proficient in SQL, Python, Tableau
• Strong communication skills

**Responsibilities:**
• Analyze business metrics and KPIs
• Create dashboards and reports
• Collaborate with product teams
• Present insights to stakeholders

**Your Match: 85%**
✅ SQL - You have 3 years
✅ Python - You have 2 years
✅ Tableau - You have 1 year
⚠️ Experience - You have 1.5 years (need 2)

───────────────────
Ketik "lamar" untuk draft lamaran
```

### Draft Application
```
📝 **Draft Lamaran - Data Analyst @ Tokopedia**

**Cover Letter:**
───────────────────
Yth. Tim Rekrutmen Tokopedia,

Saya sangat tertarik dengan posisi Data Analyst
yang tersedia di Tokopedia. Dengan pengalaman
1.5 tahun di bidang data analysis dan keahlian
dalam SQL, Python, dan Tableau, saya yakin dapat
memberikan kontribusi positif untuk tim.

Di posisi saya sebelumnya, saya berhasil:
• Meningkatkan efisiensi reporting sebesar 40%
• Membangun dashboard untuk 5 departemen
• Menganalisis data 1 juta+ transaksi

Saya sangat mengagumi inovasi Tokopedia dalam
e-commerce Indonesia dan ingin menjadi bagian
dari pertumbuhan perusahaan.

Terima kasih atas pertimbangan Bapak/Ibu.

Hormat saya,
[Nama Kamu]
───────────────────

**Common Questions:**
Q: Why do you want to work here?
A: [Draft answer based on company research...]

Q: What's your expected salary?
A: Berdasarkan riset dan pengalaman saya,
   range Rp 18-22 juta sesuai dengan posisi ini.

───────────────────
⚠️ Review draft di atas.
Ketik "edit [bagian]" untuk ubah
Ketik "kirim" untuk submit lamaran
Ketik "simpan" untuk simpan draft
```

### Job Alert Confirmation
```
🔔 Job Alert Aktif!

Keywords: "frontend developer"
Location: Remote
Frequency: Harian (jam 8 pagi)

Aku akan kabari kalau ada lowongan baru yang cocok.

Untuk manage alerts: ketik "alerts"
```

## Data Storage

### Resume Structure (resume.json)
```json
{
  "personal": {
    "name": "Your Name",
    "email": "email@example.com",
    "phone": "+628...",
    "location": "Jakarta",
    "linkedin": "linkedin.com/in/yourname"
  },
  "summary": "Brief professional summary...",
  "experience": [
    {
      "title": "Data Analyst",
      "company": "Company Name",
      "location": "Jakarta",
      "startDate": "2022-01",
      "endDate": "present",
      "highlights": [
        "Achievement 1",
        "Achievement 2"
      ]
    }
  ],
  "education": [...],
  "skills": {
    "technical": ["SQL", "Python", "Tableau"],
    "soft": ["Communication", "Problem Solving"]
  },
  "languages": ["Indonesian", "English"],
  "certifications": [...]
}
```

### Applications Tracking (applications.json)
```json
{
  "applications": [
    {
      "id": "app-001",
      "job_id": "linkedin-123",
      "company": "Tokopedia",
      "position": "Data Analyst",
      "status": "submitted",
      "applied_date": "2024-01-26",
      "last_update": "2024-01-26",
      "notes": "Waiting for response",
      "next_action": "Follow up in 1 week"
    }
  ]
}
```

## Files
- `job-search.js` - Main job search and application logic
- `linkedin-automation.js` - LinkedIn browser automation
- `indeed-automation.js` - Indeed browser automation
- `resume-parser.js` - Parse and analyze resume
- `cover-letter-generator.js` - Generate customized cover letters
