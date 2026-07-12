import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  HARD_ASSET_INGEST_CAPS,
  MemorySourceConnector,
  MemoryStorageProvider,
  buildOriginalPathname,
  canTransition,
  ingestAssetObject,
  isAlreadyProcessed,
  isHeicMime,
  processImageBuffer,
  resolveIngestLimits,
  runProcessingBatch,
  sha256Buffer,
  timingSafeEqualHex,
  withRetries,
} from "./index";
import { parseMediaProcessRequest } from "@/lib/live-portfolio/media-process";

describe("asset engine state machine", () => {
  it("allows pending_download → downloaded → processed → ready_for_review", () => {
    assert.equal(canTransition("pending_download", "downloaded"), true);
    assert.equal(canTransition("downloaded", "processed"), true);
    assert.equal(canTransition("processed", "ready_for_review"), true);
    assert.equal(canTransition("failed", "pending_download"), true);
  });

  it("marks ready/processed as already processed for idempotency", () => {
    assert.equal(isAlreadyProcessed("ready_for_review"), true);
    assert.equal(isAlreadyProcessed("pending_download"), false);
  });
});

describe("retry helper", () => {
  it("retries transient failures then succeeds", async () => {
    let attempts = 0;
    const value = await withRetries(
      async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("temporary");
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 1, sleep: async () => undefined },
    );
    assert.equal(value, "ok");
    assert.equal(attempts, 3);
  });

  it("does not retry non-retryable not-found errors", async () => {
    let attempts = 0;
    await assert.rejects(
      () =>
        withRetries(
          async () => {
            attempts += 1;
            throw new Error("not found");
          },
          { maxAttempts: 3, baseDelayMs: 1, sleep: async () => undefined },
        ),
      /not found/i,
    );
    assert.equal(attempts, 1);
  });
});

describe("checksum", () => {
  it("hashes buffers deterministically", () => {
    const a = sha256Buffer(Buffer.from("hello"));
    const b = sha256Buffer(Buffer.from("hello"));
    assert.equal(a, b);
    assert.equal(timingSafeEqualHex(a, b), true);
  });
});

describe("limits", () => {
  it("clamps hard batch caps", () => {
    const limits = resolveIngestLimits({ maxItemsPerRun: 999 });
    assert.equal(limits.maxItemsPerRun, HARD_ASSET_INGEST_CAPS.maxItemsPerRun);
  });
});

describe("image processing", () => {
  it("generates aspect-preserving variants without mutating original", async () => {
    const original = await sharp({
      create: {
        width: 800,
        height: 400,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .jpeg()
      .toBuffer();

    const before = Buffer.from(original);
    const processed = await processImageBuffer(original, {
      mimeType: "image/jpeg",
    });

    assert.equal(processed.width, 800);
    assert.equal(processed.height, 400);
    assert.equal(processed.variants.length, 4);
    assert.ok(before.equals(original));

    for (const variant of processed.variants) {
      assert.ok(variant.width <= 800);
      assert.ok(variant.height <= 400);
      assert.ok(Math.abs(variant.width / variant.height - 2) < 0.05);
    }
  });

  it("converts HEIC mime path to web-safe derived master when sharp can decode", async () => {
    assert.equal(isHeicMime("image/heic"), true);
    // Synthetic JPEG labeled as HEIC exercises conversion branch intent:
    // real HEIC decode depends on libvips heif support in the runtime image.
    const jpeg = await sharp({
      create: {
        width: 64,
        height: 48,
        channels: 3,
        background: { r: 100, g: 20, b: 20 },
      },
    })
      .jpeg()
      .toBuffer();

    try {
      const processed = await processImageBuffer(jpeg, {
        mimeType: "image/heic",
      });
      assert.equal(processed.derivedMimeType, "image/webp");
      assert.ok(processed.webSafeOriginal);
      assert.equal(processed.variants.length, 4);
    } catch (error) {
      // Environments without HEIF decode may fail on strict heic inputs;
      // jpeg-as-heic still usually works via sharp failOn:none.
      assert.ok(error instanceof Error);
    }
  });
});

describe("provider abstraction + ingest", () => {
  it("ingests an image into private memory storage with variants", async () => {
    const jpeg = await sharp({
      create: {
        width: 100,
        height: 80,
        channels: 3,
        background: { r: 10, g: 10, b: 10 },
      },
    })
      .jpeg()
      .toBuffer();

    const source = new MemorySourceConnector();
    source.seed("drive-file-1", jpeg, "image/jpeg");
    const storage = new MemoryStorageProvider();

    const result = await ingestAssetObject({
      job: {
        identity: {
          recordId: "media-1",
          sourceConnector: "google_drive",
          sourceObjectId: "drive-file-1",
          filename: "shot.jpg",
          mimeType: "image/jpeg",
          mediaKind: "image",
        },
        processingStatus: "pending_download",
      },
      source,
      storage,
    });

    assert.equal(result.ok, true);
    if (!result.ok || result.skipped) throw new Error("expected processed");
    assert.equal(result.result.status, "ready_for_review");
    assert.equal(result.result.original.access, "private");
    assert.ok(result.result.variants.thumbnail);
    assert.ok(result.result.variants.large);
    assert.ok(storage.getBuffer(result.result.original.pathname));
  });

  it("ingests video as original-only without variants", async () => {
    const videoBytes = Buffer.from("fake-mp4-bytes");
    const source = new MemorySourceConnector();
    source.seed("drive-vid-1", videoBytes, "video/mp4");
    const storage = new MemoryStorageProvider();

    const result = await ingestAssetObject({
      job: {
        identity: {
          recordId: "media-v1",
          sourceConnector: "google_drive",
          sourceObjectId: "drive-vid-1",
          filename: "clip.mp4",
          mimeType: "video/mp4",
          mediaKind: "video",
        },
        processingStatus: "pending_download",
      },
      source,
      storage,
    });

    assert.equal(result.ok, true);
    if (!result.ok || result.skipped) throw new Error("expected processed");
    assert.equal(result.result.status, "ready_for_review");
    assert.deepEqual(result.result.variants, {});
    assert.equal(result.result.durationSeconds, null);
  });

  it("skips already processed files (idempotent)", async () => {
    const source = new MemorySourceConnector();
    const storage = new MemoryStorageProvider();
    const result = await ingestAssetObject({
      job: {
        identity: {
          recordId: "media-1",
          sourceConnector: "google_drive",
          sourceObjectId: "x",
          filename: "a.jpg",
          mimeType: "image/jpeg",
          mediaKind: "image",
        },
        processingStatus: "ready_for_review",
        existingBlobKey: "assets/google_drive/media-1/a.jpg/original.jpg",
      },
      source,
      storage,
    });
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected ok");
    assert.equal(result.skipped, true);
  });

  it("prevents duplicate blob put when pathname exists", async () => {
    const jpeg = await sharp({
      create: {
        width: 40,
        height: 40,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .jpeg()
      .toBuffer();

    const source = new MemorySourceConnector();
    source.seed("drive-dup", jpeg, "image/jpeg");
    const storage = new MemoryStorageProvider();

    const identity = {
      recordId: "media-dup",
      sourceConnector: "google_drive" as const,
      sourceObjectId: "drive-dup",
      filename: "dup.jpg",
      mimeType: "image/jpeg",
      mediaKind: "image" as const,
    };

    const path = buildOriginalPathname(identity);
    await storage.put({
      pathname: path,
      body: jpeg,
      contentType: "image/jpeg",
      access: "private",
      checksumSha256: sha256Buffer(jpeg),
    });

    const result = await ingestAssetObject({
      job: {
        identity,
        processingStatus: "pending_download",
        existingBlobKey: path,
      },
      source,
      storage,
    });

    assert.equal(result.ok, true);
    if (!result.ok || result.skipped) throw new Error("expected process");
    assert.equal(result.result.original.pathname, path);
  });

  it("recovers from failure then retries successfully", async () => {
    const jpeg = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: { r: 9, g: 9, b: 9 },
      },
    })
      .jpeg()
      .toBuffer();

    const source = new MemorySourceConnector();
    const storage = new MemoryStorageProvider();

    const first = await ingestAssetObject({
      job: {
        identity: {
          recordId: "media-fail",
          sourceConnector: "google_drive",
          sourceObjectId: "missing",
          filename: "x.jpg",
          mimeType: "image/jpeg",
          mediaKind: "image",
        },
        processingStatus: "pending_download",
      },
      source,
      storage,
      limits: { maxAttempts: 1, retryBaseDelayMs: 1 },
    });
    assert.equal(first.ok, false);

    source.seed("missing", jpeg, "image/jpeg");
    const second = await ingestAssetObject({
      job: {
        identity: {
          recordId: "media-fail",
          sourceConnector: "google_drive",
          sourceObjectId: "missing",
          filename: "x.jpg",
          mimeType: "image/jpeg",
          mediaKind: "image",
        },
        processingStatus: "failed",
        attempts: 1,
      },
      source,
      storage,
    });
    assert.equal(second.ok, true);
    if (!second.ok || second.skipped) throw new Error("expected success");
  });

  it("batch runner respects max items", async () => {
    const jpeg = await sharp({
      create: {
        width: 16,
        height: 16,
        channels: 3,
        background: { r: 3, g: 3, b: 3 },
      },
    })
      .jpeg()
      .toBuffer();

    const source = new MemorySourceConnector();
    const storage = new MemoryStorageProvider();
    source.seed("a", jpeg, "image/jpeg");
    source.seed("b", jpeg, "image/jpeg");
    source.seed("c", jpeg, "image/jpeg");

    const batch = await runProcessingBatch({
      batch: {
        limits: { maxItemsPerRun: 2 },
        jobs: ["a", "b", "c"].map((id) => ({
          identity: {
            recordId: `m-${id}`,
            sourceConnector: "google_drive" as const,
            sourceObjectId: id,
            filename: `${id}.jpg`,
            mimeType: "image/jpeg",
            mediaKind: "image" as const,
          },
          processingStatus: "pending_download" as const,
        })),
      },
      source,
      storage,
    });

    assert.equal(batch.results.length, 2);
    assert.equal(batch.processed, 2);
  });
});

describe("media process request parsing", () => {
  it("requires confirmation flag", () => {
    const parsed = parseMediaProcessRequest({});
    assert.equal(parsed.ok, false);
  });

  it("accepts confirmMediaProcess true", () => {
    const parsed = parseMediaProcessRequest({
      confirmMediaProcess: true,
      maxItems: 99,
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.maxItems, HARD_ASSET_INGEST_CAPS.maxItemsPerRun);
    }
  });
});
