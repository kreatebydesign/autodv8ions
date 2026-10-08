# Deployment checklist (future shops)

Use when standing up a new KXD Automotive Client OS deployment. Do not store secrets in git.

## Brand

- [ ] `brandName`
- [ ] `workspaceLabel`
- [ ] Square `logoMark` asset
- [ ] Optional `logoWordmark`
- [ ] `accent` hex → CSS mapping
- [ ] `supportEmail`
- [ ] `businessType`

Config entry point today: `lib/workspace/brand.ts` (swap or override per deploy).

## Google / integrations

- [ ] Google OAuth / Workspace for Calendar + Gmail
- [ ] Drive root folder taxonomy documented for the shop
- [ ] Calendar connected and tested
- [ ] Gmail send/reply tested from a job
- [ ] Reconnect copy uses deployment `supportEmail`

## Data / env

- [ ] Supabase project + migrations applied
- [ ] RLS reviewed for admin server paths
- [ ] `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET`
- [ ] Blob / asset engine credentials
- [ ] AI/intelligence keys only if enabled

## Service catalog

- [ ] Job service types match shop offerings
- [ ] Status vocabulary agreed with shop

## QA

- [ ] Login / logout
- [ ] Dashboard loads; notifications open
- [ ] Customers nested load + search + detail
- [ ] Jobs schedule + Gmail
- [ ] Invoice create/print
- [ ] Content import → media → review → publish smoke
- [ ] Public portfolio shows published only

## Security

- [ ] Admin routes redirect when logged out
- [ ] Dangerous APIs require session (and later capabilities)
- [ ] No operator tools exposed as “client-safe” without real auth
- [ ] Secrets only in env / host vault
