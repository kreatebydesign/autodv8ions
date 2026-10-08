# Design system

## Source of truth (production-approved)

1. **Login** — atmospheric, private entry
2. **Dashboard** — elevated shell (`.dash-*`)
3. **Customers** — dense CRM master/detail (`.crm-*`)

Phase 1 elevates the **shared shell** to match that quality without redesigning those pages.

---

## Principles

- Near-black fields; smoked charcoal surfaces
- Fine hairlines; subtle inset depth — not decorative gradients
- Restrained brand accent for active/status/danger only
- Editorial typography: light display weights, tight letter-spacing on kickers
- Efficient density; generous where hierarchy needs air
- Automotive / luxury operating-system feel

## Explicitly avoid

- Generic SaaS card grids
- Neon / glow / gamer chrome
- Purple-on-white AI defaults
- Rounded-pill overload
- Analytics-dashboard clutter in primary views
- Giant empty boxes to “fill space”

---

## Token families (current)

| Prefix | Home | Role |
|--------|------|------|
| `--dv8-*` | `admin.css` | Base admin theme |
| `--dash-*` | `admin-dashboard.css` | Shell + dashboard |
| `--crm-*` | `admin-customers.css` | Clients record workspace |
| `--login-*` | `admin-login.css` | Login |

**Phase 2** consolidates aliases. Phase 1 only adds shell lockup/nav styles; does not delete or globally replace variables.

---

## Shell brand lockup

- Recognizable square mark (~52px rail / ~36px mobile)
- Brand name only (no client-facing kicker)
- Quiet mark frame (hairline + charcoal), no glow
- Secondary advanced links sit beneath a quiet divider, visually secondary to daily operations
