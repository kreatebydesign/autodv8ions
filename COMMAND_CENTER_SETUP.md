# AutoDV8ions Command Center — Setup Guide

Premium shop operating system for Chris and Lisa. Built around the existing Google Voice → Google Calendar → Google Drive workflow.

---

## 1. Files Created

### Database
- `supabase/migrations/001_command_center.sql`

### Auth & Core
- `middleware.ts`
- `lib/auth/session.ts`
- `lib/auth/require-admin.ts`
- `lib/constants/jobs.ts`
- `lib/types/database.ts`
- `lib/supabase/server.ts`
- `lib/utils/format.ts`
- `lib/jobs/service.ts`
- `lib/google/calendar.ts`
- `lib/google/drive.ts`

### API Routes
- `app/api/admin/login/route.ts`
- `app/api/admin/logout/route.ts`
- `app/api/jobs/route.ts`
- `app/api/jobs/[id]/route.ts`
- `app/api/customers/route.ts`
- `app/api/invoices/route.ts`
- `app/api/invoices/[id]/route.ts`
- `app/api/google/calendar/route.ts`
- `app/api/content/route.ts`

### Admin UI
- `app/admin/admin.css`
- `app/admin/page.tsx`
- `app/admin/login/page.tsx`
- `app/admin/(shell)/layout.tsx`
- `app/admin/(shell)/dashboard/page.tsx`
- `app/admin/(shell)/jobs/page.tsx`
- `app/admin/(shell)/customers/page.tsx`
- `app/admin/(shell)/invoices/page.tsx`
- `app/admin/(shell)/invoices/new/page.tsx`
- `app/admin/(shell)/invoices/[id]/page.tsx`
- `app/admin/(shell)/content/page.tsx`
- `app/admin/(shell)/settings/page.tsx`

### Components
- `components/admin/AdminSidebar.tsx`
- `components/admin/AdminLoginForm.tsx`
- `components/admin/StatCard.tsx`
- `components/admin/JobStatusBadge.tsx`
- `components/admin/JobsClient.tsx`
- `components/admin/ContentClient.tsx`
- `components/admin/InvoiceForm.tsx`
- `components/admin/InvoicePrintView.tsx`

### SEO Gallery
- `app/recent-work/[slug]/page.tsx`

---

## 2. Files Modified

- `app/api/tint-quote/route.ts` — improved field mapping + auto-creates jobs from website quotes
- `package.json` / `package-lock.json` — added `googleapis`

---

## 3. Supabase SQL Migrations

Run `supabase/migrations/001_command_center.sql` in the Supabase SQL Editor.

Creates:
- `customers`
- `vehicles`
- `jobs`
- `invoices`
- `content_uploads`
- `gallery_items`

Does **not** modify existing `tint_quote_leads` table.

---

## 4. Required Vercel Environment Variables

### Admin Auth
```
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=   # long random string
```

### Supabase (existing)
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Email (existing tint quote)
```
RESEND_API_KEY=
```

### Google Calendar (optional)
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=     # sales@autodv8ions.com calendar ID
```

### Google Drive (optional)
```
GOOGLE_DRIVE_UPLOADS_FOLDER_ID=   # ID of 05-Daily-Uploads folder
```

---

## 5. Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Google Calendar API**
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI for OAuth playground or your auth flow
6. Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) to generate a refresh token with Calendar scope:
   - `https://www.googleapis.com/auth/calendar`
7. Set `GOOGLE_CALENDAR_ID` to the calendar used by Lisa (`sales@autodv8ions.com`)
8. Add all four Google env vars to Vercel

If not configured, the Command Center shows:
**"Google Calendar is not connected yet."**

Jobs still work. Manual calendar workflow unchanged.

---

## 6. Google Drive Integration Setup

1. In the same Google Cloud project, enable **Google Drive API**
2. Reuse the same OAuth client + refresh token (add Drive scope):
   - `https://www.googleapis.com/auth/drive.readonly`
3. Open Google Drive → `05-Daily-Uploads`
4. Copy the folder ID from the URL
5. Set `GOOGLE_DRIVE_UPLOADS_FOLDER_ID`

Expected folder structure:
```
05-Daily-Uploads/
├── Tint-Jobs/
├── Security-Installs/
├── Remote-Starters/
├── Custom-Mods/
├── Audio/
└── Other/
```

Lisa continues uploading daily. In Command Center → **Content**, click **Sync Google Drive**.

Sync will:
- Mirror folders into `content_uploads`
- Auto-generate gallery entries in `gallery_items`
- Create SEO pages at `/recent-work/[slug]`

No approval workflow required.

---

## 7. Local Testing

1. Copy env vars into `.env.local`
2. Run Supabase migration
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start dev server:
   ```bash
   npm run dev
   ```
5. Visit:
   - Public site: `http://localhost:3000`
   - Tint quote: `http://localhost:3000/tint-quote`
   - Command Center login: `http://localhost:3000/admin/login`

6. Sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
7. Submit a tint quote → verify:
   - Email sends (if Resend configured)
   - Row in `tint_quote_leads`
   - New job appears in `/admin/jobs`

---

## 8. Production Deployment

1. Push to GitHub
2. Deploy on Vercel (existing project)
3. Add all environment variables in Vercel → Settings → Environment Variables
4. Run Supabase migration on production database
5. Redeploy
6. Test:
   - `/admin/login`
   - Website tint quote submission
   - Job creation
   - Invoice print
   - Google Calendar event from a job (if connected)
   - Drive sync from Content page (if connected)

---

## Workflow Alignment

| Step | Who | Command Center Support |
|------|-----|------------------------|
| Quote / call comes in | Customer | Auto job from website quote |
| Contact customer | Chris | Click-to-call, click-to-email on Jobs |
| Schedule appointment | Lisa | Create Google Calendar event, copy details |
| Vehicle in shop | Lisa | Update job status |
| Ready for pickup | Lisa | Status → Ready for Pickup |
| Completed | Lisa | Status → Completed |
| Upload media | Lisa | Drive sync → Content + gallery SEO pages |

---

## Logos

Uses existing assets (do not rename):
- Sidebar: `public/images/logos/dv8-logo.png`
- Login: `public/images/logos/autodv8ions-fb-pic-logo.png`
- Invoices: `public/images/logos/autodv8ions-hero-logo.png`

---

## Notes

- No customer accounts or portals
- No payment processing
- No SMS/email automation beyond existing tint quote notification
- Homepage and service pages unchanged
- Google Calendar and Drive are optional — system degrades gracefully
