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

### Google Drive — Live Portfolio (Vercel OIDC / Workload Identity Federation)
```
# Preferred auth (no JSON service-account key)
GCP_PROJECT_ID=
GCP_PROJECT_NUMBER=
GCP_SERVICE_ACCOUNT_EMAIL=
GCP_WORKLOAD_IDENTITY_POOL_ID=
GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID=
GCP_AUDIENCE=

# Tint Jobs folder (required)
GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID=

# Optional fallbacks if Tint Jobs ID is not set
GOOGLE_DRIVE_CONTENT_VAULT_FOLDER_ID=
GOOGLE_DRIVE_UPLOADS_FOLDER_ID=
```

### Live Portfolio sync options (optional)
```
BLOB_READ_WRITE_TOKEN=                   # Phase 1B+ storage — not used for auth
CRON_SECRET=                             # future cron — not used for auth
PORTFOLIO_SYNC_START_DATE=               # optional YYYY-MM-DD
PORTFOLIO_SYNC_END_DATE=                 # optional YYYY-MM-DD
PORTFOLIO_SYNC_MAX_FOLDERS=              # optional, default 25
PORTFOLIO_SYNC_MODE=                     # current-and-previous-month | current-month-only | historical-backfill | date-range
```

**Deprecated / do not use for Drive auth:**
```
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=      # DEPRECATED — never use JSON keys with Vercel OIDC
GOOGLE_SERVICE_ACCOUNT_EMAIL=            # use GCP_SERVICE_ACCOUNT_EMAIL instead
```

Drive auth prefers Vercel OIDC → Google STS → service-account impersonation.
Calendar continues to use the separate OAuth refresh-token variables above.

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

## 6. Google Drive Integration (Vercel OIDC / Workload Identity Federation)

Drive portfolio access uses **keyless** authentication:

```
Vercel OIDC token (GCP_AUDIENCE)
  → Google STS token exchange
  → Impersonate GCP_SERVICE_ACCOUNT_EMAIL
  → Google Drive API (drive.readonly)
  → Tint Jobs folder
```

### Required GCP / Vercel setup

1. Enable **Google Drive API**
2. Create Workload Identity Pool + OIDC provider trusted to Vercel (`issuer`: Global `https://oidc.vercel.com` or Team issuer)
3. Map `google.subject` = `assertion.sub`
4. Bind production Vercel subject to the service account (`roles/iam.workloadIdentityUser`)
5. Share **AutoDV8ions Content Vault** (or Tint Jobs) with the service account email
6. Set Vercel env vars listed above (`GCP_*` + `GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID`)
7. Enable **OIDC federation** on the Vercel project (Settings → Security)

`GCP_AUDIENCE` is **optional** and must NOT be passed into `getVercelOidcToken()` when the provider uses **Allowed audiences** (`https://vercel.com/kxd`).

Passing a custom audience triggers `@vercel/oidc` token exchange at `https://oidc.vercel.com/~token`, which can rewrite `iss` to `https://oidc.vercel.com/kxd` and break a Global-issuer provider (`https://oidc.vercel.com`).

### Auth modes in this app

- **Preferred:** Vercel OIDC / WIF when all `GCP_*` vars + folder ID are set
- **Legacy fallback only:** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` (same OAuth trio Calendar uses)
- **Never:** JSON service-account private keys (`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` is deprecated)

### Local development note

Copying `GCP_*` into `.env.local` is **not** enough. Local OIDC requires a linked Vercel project and a development OIDC token (`vercel link` + `vercel env pull`, which provides `VERCEL_OIDC_TOKEN`). Production Functions receive the token via Vercel’s OIDC runtime.

### Verify connection

In Command Center → **Content** → **Check Drive Connection**.

This authenticates and lists the Tint Jobs folder name + a few child folder names only.
It does **not** sync, import, download media, write to the database, or publish.

### Phase 1B — Read-only Drive discovery preview

In Command Center → **Content** → **Preview Drive Discovery**.

Readonly guarantee:
- Uses the same WIF Drive auth as the connection check
- Walks Tint Jobs → month folders → job folders → media metadata only
- **No** database writes, downloads, Blob uploads, imports, or publishing

Discovery assumptions:
- Month folders live directly under Tint Jobs
- Job/customer folders live directly under each month folder
- Nested folders inside a job folder are noted/ignored (not traversed deeper in Phase 1B)
- Loose files directly under a month folder are ignored as non-job items
- Folder names are never renamed in Drive

Supported discovery media MIME types:
- `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
- `video/mp4`, `video/quicktime`

Ignored with reasons:
- Google Workspace files, PDFs, archives, hidden/system files, thumbnail-like names, unsupported MIME types

Known naming irregularities handled:
- `2026-07 JULY`, `2026-06 JUNE`, `2026-04 APRIL`
- `2026-2 FEB` (single-digit month → sort key `2026-02`)
- Unparseable month folders are still inventoried with warnings (not invented)

### Phase 1C — Pending-only import plan dry run

In Command Center → **Content** → **Preview Import Plan**.

Dry-run guarantee:
- Discovers Drive inventory (readonly)
- SELECT-only reads of `gallery_items` / `gallery_media`
- Builds a deterministic create/match/skip/conflict plan
- **`writesPerformed=false` always**
- No downloads, Blob uploads, publishing, or homepage changes

Matching rules (Drive IDs are canonical):
- Gallery item match: `gallery_items.drive_folder_id === job folder Drive ID`
- Gallery media match: `gallery_media.drive_file_id === media Drive file ID`
- Same folder/file **name** with a different Drive ID → conflict (not a silent match)
- Human-edited / locked items (`provisional_vehicle=false` or approved/rejected/archived) → match preserves metadata; no overwrite planned

Pending-only defaults for any future create candidates:
- `status: pending`
- `published: false`
- `featured: false`
- homepage visibility false
- no public media URL / no storage URL

Still prohibited after Phase 1C:
- Actual import writes
- Media downloads
- Vercel Blob uploads
- Auto-publish / homepage wiring
- Changing Sync button behavior

### Phase 1D — Controlled pending-only database import (first write boundary)

In Command Center → **Content** → **Import Recent as Pending**.

This is the **first phase allowed to write** to the database for the Live Portfolio Engine.

**Scope**
- Creates `gallery_items` as **pending only** (`status=pending`, `published=false`)
- Creates `gallery_media` **metadata only** (no file bytes)
- Recent-first batch only (does **not** import all Drive jobs in one run)

**Default / hard batch limits**
- Newest month folders first
- Max **3** months per run
- Max **60** gallery items per run
- Max **150** media records per run

**Request**
- `POST /api/content/drive-import-pending`
- Body must include `{ "confirmPendingImport": true }`
- Optional: `maxMonths`, `maxItems`, `maxMedia` (clamped to hard caps above)
- Admin session required
- GET is rejected (`405`) — no GET mutations

**Pending-only guarantees**
- No media downloads
- No Vercel Blob uploads
- No public media URLs / `storage_url`
- No publishing / homepage changes
- No automatic follow-up sync
- Does not change Sync Recent Tint Jobs / Historical Backfill behavior
- Does not invent customer PII, SEO copy, tint %, or captions

**Idempotency**
- Gallery items match on `drive_folder_id` (unique)
- Gallery media match on `drive_file_id`
- Rerunning the same batch returns created/matched counts and must not duplicate rows
- Human-edited / locked items (`provisional_vehicle=false` or approved/rejected/archived) are matched and **not overwritten**

**Schema verification**
- Before writes, verifies Phase 0 migration `003_live_portfolio_foundations.sql` fields/tables exist
- Write mode **fails closed** if `gallery_media` (or required columns) are missing — no silent empty-media fallback

**Transaction / recovery**
- Production path uses **per-job compensating rollback**: if media inserts fail after a new item insert, that gallery item is deleted (cascade) and counted as rolled back
- Unique Drive IDs make partial runs recoverable by re-running the same import
- To roll back a whole accidental batch: delete pending `gallery_items` created with `import_scope='recent'` for the affected Drive folder IDs (media cascades)

**Prohibited in Phase 1D**
- Downloading Drive binaries
- Blob uploads
- Publishing / approving
- Homepage gallery wiring
- Changing tint quote, jobs, calendar, or legacy Sync flows

### Sync behavior (unchanged from Phase 0; not part of auth/discovery/plan verification)

Real production structure:

```
AutoDV8ions Content Vault (Main Shared )
└── UPLOAD HERE - RAW CONTENT
    └── Tint Jobs                   ← ONLY portfolio source
        ├── 2026-07 JULY
        └── ...
```

- Imports Tint Jobs only when Sync is clicked
- Creates/updates `gallery_items` as `status=pending`, `published=false`
- Inventories media metadata only
- Does **not** auto-approve or auto-publish
- Does **not** invent SEO copy, captions, tint %, years, or marketing claims

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
