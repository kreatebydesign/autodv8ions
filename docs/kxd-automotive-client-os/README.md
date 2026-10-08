# KXD Automotive Client OS

Internal product name for the authenticated automotive operations product that KXD designs, builds, and deploys for shop clients.

**AutoDV8ions** is the first production implementation — a branded deployment of this OS, not the product definition itself.

---

## Product purpose

Give shop owners and operators a **private, premium operations surface** to run:

- customers and vehicles
- jobs and scheduling
- customer communications (Gmail)
- simple invoicing
- photography / portfolio content from Drive → website

It should feel like a shop’s own operating system — calm, precise, automotive — not a generic SaaS admin template.

---

## Target businesses

- Window tint shops
- Detailers
- Wrap shops
- Automotive customization shops
- Performance shops
- Closely related service businesses

Deployments share the OS shell and CRM/content patterns; brand, mailbox, Drive taxonomy, and service catalog stay deployment-specific.

---

## Design philosophy

Established in production by AutoDV8ions **Login**, **Dashboard**, and **Customers**:

- Near-black / smoked charcoal surfaces
- Fine hairlines, controlled depth
- Restrained brand accent (never neon)
- Editorial typography
- Dense enough to operate, never cramped
- No card soup, no gamer UI, no analytics clutter

See [DESIGN.md](./DESIGN.md).

---

## Current maturity (AutoDV8ions)

| Surface | Maturity | Notes |
|---------|----------|--------|
| Login | Approved production | Including AD8-specific Marlboro easter egg |
| Dashboard | Approved production | Ops glance + Gmail replies |
| Customers | Approved production | Master/detail + nested query |
| Shell / nav | Phase 1 elevated | Brand config + approved product vocabulary |
| Jobs | Phase 2 elevated | Master/detail + deep-link + Messages |
| Invoices | MVP billing | Billing nav label; Phase 4 candidate |
| Content pipeline | Powerful, engineer-facing | Phase 5 client IA |
| Auth roles | None | Single admin credential (Phase 7) |

---

## Reusable product boundary

**KXD IP (reusable):** shell, design tokens/patterns, CRM models, Gmail/Calendar integration patterns, content pipeline engine, review/publish flow, portfolio rotation/retention.

**Deployment-specific:** logos, accent, support email, Drive folder taxonomy, service types, public marketing site, easter eggs, mailbox identity.

See [MODULES.md](./MODULES.md) and [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## AutoDV8ions as first implementation

AD8 proves the direction in production. Productization proceeds **incrementally** without destabilizing approved surfaces. AD8-only notes live in [AD8-DEPLOYMENT.md](./AD8-DEPLOYMENT.md).

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [AUTH.md](./AUTH.md)
- [CONTENT-PIPELINE.md](./CONTENT-PIPELINE.md)
- [DESIGN.md](./DESIGN.md)
