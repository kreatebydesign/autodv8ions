# Architecture

## Authenticated shell

```
/admin/login          → public login (outside shell)
/admin/(shell)/*      → authenticated workspace
```

Shell layout (`app/admin/(shell)/layout.tsx`):

- `GmailNotificationsProvider`
- `AdminSidebar` (brand lockup + grouped nav)
- `main.dash-main` with mobile brand bar + page content

CSS layers:

- `admin.css` — base `.admin-theme` primitives (`--dv8-*`)
- `admin-dashboard.css` — shell chrome (`.dash-*`)
- `admin-login.css` — login only
- `admin-customers.css` — Customers workspace only

**Phase 1:** brand config (`lib/workspace/brand.ts`) + `AdminBrandLockup` feed the rail and mobile bar. Full token consolidation is deferred.

---

## CRM

### Customers (approved)

- Single nested Supabase select: customers → vehicles, jobs(+vehicles), invoices
- Active-only filter (`archived_at IS NULL`); archived jobs filtered client-side
- Master/detail operator UI; client-side search
- Soft archive via `DELETE /api/customers/[id]` (no hard delete)

Preserve: nested query architecture from `ed00a5a`, UX from `8872c4a`.

### Jobs

- List + `?jobId=` full detail (status, vehicle, calendar, Gmail, notes, invoice link)
- Hard delete exists (future: harden toward archive)
- Visually behind Customers; Phase 3 uplift target

### Invoices

- List / create / print detail
- Optional `job_id` / `customer_id`
- MVP billing — not full AR

### Dashboard

- KPIs, quick actions, Customer Replies, recent jobs, calendar appointments
- Approved production presentation; keep Gmail polling + bell intact

---

## Communications

| Integration | Role |
|-------------|------|
| Gmail | Thread + reply on jobs; unread badge + Customer Replies panel |
| Google Calendar | Schedule / reschedule / cancel appointments from jobs |

Session is binary admin today; mailbox identity is deployment-specific (`supportEmail` in brand config).

---

## Content pipeline

See [CONTENT-PIPELINE.md](./CONTENT-PIPELINE.md).

High level:

Drive → import metadata → media process (private Blob) → review → publish → portfolio engine → public site.

---

## Public portfolio relationship

Published gallery items with Blob-backed media appear on:

- Homepage showcase
- `/recent-work` and project pages

Drive remains the permanent archive. Blob cleanup does not delete Drive originals.
