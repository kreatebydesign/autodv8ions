# KXD Asset Engine

Reusable media ingestion infrastructure. **AutoDV8ions Live Portfolio is the first production implementation**, not the long-term product boundary.

## What belongs in the Asset Engine

| Layer | Location | Purpose |
|--------|----------|---------|
| Types / state machine | `lib/asset-engine/` | Connector-agnostic contracts |
| Storage providers | `lib/asset-engine/storage/` | Vercel Blob (now), S3/R2/GCS/local (later) |
| Source connectors | `lib/asset-engine/source/` | Google Drive (now), Dropbox/OneDrive/S3/local (later) |
| Image / video processing | `lib/asset-engine/processing/` | Variants, HEIC→web-safe, video metadata hooks |
| Pipeline / job runner | `lib/asset-engine/pipeline/` | Sync runner today; cron/queue-ready API |

## What is AutoDV8ions-specific

| Layer | Location | Purpose |
|--------|----------|---------|
| Gallery adapter | `lib/live-portfolio/media-process.ts` | Maps `gallery_media` ↔ Asset Engine jobs |
| Admin UI | `/admin/media`, `MediaProcessingClient` | Review queue for this site |
| API | `POST/GET /api/content/media-process` | Admin-only AutoDV8ions entrypoint |

Do **not** put AutoDV8ions brand rules, tint %, SEO copy, or homepage publishing inside `lib/asset-engine/`.

## Phase 2A scope

- Download from Drive (read-only)
- Private storage only (`access: "private"`)
- Image variants: thumbnail / small / medium / large
- HEIC/HEIF → preserve original + web-safe derived master
- Video: original + metadata hooks only (no transcode)
- States: `pending_download` → `downloaded` → `processed` → `ready_for_review` (or `failed`)
- **No** public URLs, homepage wiring, publishing, or Drive deletes

## Storage architecture

```
SourceConnector.downloadObject()
        ↓
   checksum (sha256)
        ↓
StorageProvider.put({ access: "private" })
  Vercel Blob auth (preferred):
    BLOB_STORE_ID + VERCEL_OIDC_TOKEN / getVercelOidcToken()
  Optional fallback (local/off-Vercel only):
    BLOB_READ_WRITE_TOKEN
        ↓
 image: variants + optional web-safe master
 video: original only
        ↓
 consumer adapter persists keys/metadata (still unpublished)
```

Do **not** require a long-lived Blob RW token on Vercel when the store is connected via OIDC.

## Processing limits (defaults)

- Max **5** items per run (hard cap **10**)
- Max image **40 MB**
- Max video **200 MB**
- Download timeout **90 s**
- Retry **3** attempts with exponential backoff

## Future (not Phase 2A)

- Dropbox / OneDrive / local upload / S3 connectors
- S3 / R2 / GCS storage providers
- Queue workers / cron ticks (`runProcessingWorkerTick`)
- Video posters / transcode
- Public delivery / CDN publishing
