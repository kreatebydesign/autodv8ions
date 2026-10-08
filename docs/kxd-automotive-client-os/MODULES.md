# Modules — Reusable KXD IP vs Deployment-Specific

## Reusable KXD IP

| Module | Notes |
|--------|--------|
| Authenticated shell | Route group, rail, mobile bar, notifications provider |
| Brand lockup pattern | Driven by `lib/workspace/brand.ts` |
| Navigation IA pattern | Overview · Jobs · Clients · Billing / Media · Review / Settings + secondary Processing · Showcase |
| Design language | Charcoal, hairlines, restrained accent (see DESIGN.md) |
| Clients master/detail | Master/detail + nested query pattern |
| Jobs master/detail | Status, schedule, notes, messages, billing |
| Invoice MVP model | Line items, deposit, balance, paid flag |
| Gmail notification pattern | Polling, bell, replies → job |
| Calendar appointment pattern | Create/update/cancel from job |
| Content pipeline engine | Import → process → review → publish |
| Portfolio engine | Limits, pins, retention, Blob cleanup |
| Admin auth primitives | HMAC cookie, middleware gate, `requireAdminSession` |

---

## Deployment-specific

| Concern | Example (AutoDV8ions) |
|---------|------------------------|
| `brandName` / logos | AutoDV8ions, hero mark, DV8 wordmark |
| `accent` | `#d30b0b` |
| `supportEmail` | sales@… |
| `businessType` | tint |
| Cookie naming | `dv8_admin_session` (historical) |
| Drive taxonomy | “Tint Jobs” month/job folders |
| Service catalog | Window tint, audio, etc. |
| Public marketing site | autodv8ions.com pages |
| Login easter eggs | Marlboro |
| Env credentials | Single shop admin pair |

---

## Phase boundary

Phase 1 wires brand config into the **shell only**. Broader string/logo replacement across invoices, job copy, and settings is later work — not a giant find-replace.
