# AutoDV8ions deployment notes

Deployment-specific facts for the first production OS instance. **No secrets.**

## Brand

| Field | Value |
|-------|--------|
| brandName | AutoDV8ions |
| workspaceLabel | (unused in shell UI) |
| logoMark | `/images/logos/autodv8ions-hero-logo.png` |
| logoWordmark | `/images/logos/dv8-logo.png` |
| accent | `#d30b0b` |
| supportEmail | sales@autodv8ions.com |
| businessType | tint |

## Login

- Premium login surface (approved)
- **Marlboro Lights easter egg** image on login — AD8-only; do not carry to other shops unless requested

## Mailbox / Workspace

- Primary shop mailbox identity: sales@autodv8ions.com
- Cookie name historically: `dv8_admin_session`

## Drive taxonomy

- Content workflow assumes a **Tint Jobs**-oriented Google Drive tree (month folders → job/vehicle folders → media)
- Preferred import path: pending review import (not legacy sync for day-to-day)

## Service / CRM assumptions

- Window tint and related AutoDV8ions service types in job constants
- Soft-archive customers; hard-delete jobs still present (harden later)

## Public website

- Production: autodv8ions.com / www.autodv8ions.com
- Portfolio engine feeds homepage + `/recent-work`
- Marketing site pages are AD8-branded and not part of the reusable OS shell

## Approved production commits (protect)

- Gmail polling / notifications
- Dashboard elevation
- Admin login elevation
- Sidebar z-index hotfix
- Customers nested-query performance
- Clients record workspace UX

Do not regress these while productizing the shared shell.
