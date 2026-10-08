# Authentication & authorization

## Current architecture (honest)

| Piece | Behavior |
|-------|----------|
| Credentials | Single env pair: `ADMIN_EMAIL` + `ADMIN_PASSWORD` |
| Login | `POST /api/admin/login` → HMAC-SHA256 session token |
| Cookie | `dv8_admin_session` (httpOnly, timed expiry) |
| Pages | `middleware.ts` redirects unauthenticated `/admin/*` (except login) to login |
| APIs | `requireAdminSession()` → 401 JSON if missing/invalid |
| Roles | **None** — binary admin or not |
| Capabilities | **None** |

Session payload is effectively `{ email, exp }` only.

---

## UI hiding is not authorization

Phase 1 navigation groups **secondary advanced links** (Processing, Showcase) as visually secondary. That is **presentation only**.

Anyone with a valid admin session can still open those URLs and call those APIs.

Do not treat sidebar grouping as a security boundary.

---

## Future direction

| Role | Intent |
|------|--------|
| **Client** | Shop owner / trusted staff — daily CRM + simplified content |
| **Operator** | KXD — full pipeline, Blob cleanup, sync, AI, system settings |
| **Staff** | Later — limited shop capabilities |

### Incremental path

1. Presentation nav (Phase 1) — done for AD8 trusted single user  
2. Session role / email allowlist (`client` \| `operator`)  
3. `requireAdminSession({ capability })` on dangerous APIs  
4. Multi-user invite model when selling multi-shop OS  

Dangerous endpoints that need real gates before multi-tenant: Blob cleanup, portfolio settings, Drive sync/import, media process, intelligence, job hard-delete, bulk publish tools.
