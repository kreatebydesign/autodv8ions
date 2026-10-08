# Content pipeline

## End-to-end flow

```
Google Drive (shop photo/video archive)
        │
        ▼
Discovery / import plan (read-only APIs)
        │
        ▼
Import metadata
  → gallery_items (pending_review, unpublished)
  → gallery_media (pending_download; no Blob yet)
        │
        ▼
Media processing
  → download from Drive → private Vercel Blob + variants
  → processing_status → ready_for_review | failed
        │
        ▼
Review
  → curate, optional AI scores, save / publish / archive / pin
        │
        ▼
Portfolio engine
  → showcase limits, pins, retention, Blob cleanup, queue trim
        │
        ▼
Public website
  → homepage + /recent-work (published + Blob-backed only)
```

**Invariant:** Drive is the permanent archive. Import/process do not auto-publish. Blob cleanup does not delete Drive files.

---

## Admin surfaces (current routes)

| Route | Nav label (Phase 1) | Audience intent |
|-------|---------------------|-----------------|
| `/admin/content` | Incoming | Bring Drive jobs into the review queue |
| `/admin/media` | Media Processing | secondary advanced links — Blob download/process queue |
| `/admin/review` | Review | Curate and publish |
| `/admin/portfolio` | Showcase | secondary advanced links — limits, retention, cleanup |

Future client IA may introduce a safer **Live Work** view; Portfolio Engine must not be deceptively labeled Live Work while it exposes cleanup/retention controls.

---

## Key libraries

- `lib/google/drive*.ts`, `drive-import-pending.ts`
- `lib/live-portfolio/*`
- `lib/asset-engine/*`
- `lib/portfolio-engine/*`
- `lib/portfolio-intelligence/*`

## Key APIs

Content: `drive-check`, `drive-discovery-preview`, `drive-import-plan`, `drive-import-pending`, `media-process`, `publish`, `media-file/[id]`

Portfolio: `settings`, `cleanup`, `lifecycle`, `review/bulk`, `intelligence/*`, public `media/[id]`
