import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("media queue module isolation", () => {
  it("media-queue.ts does not import asset-engine barrel or sharp", () => {
    const src = readFileSync(
      path.join(root, "lib/live-portfolio/media-queue.ts"),
      "utf8",
    );
    assert.equal(src.includes('from "@/lib/asset-engine"'), false);
    assert.equal(src.includes('from "sharp"'), false);
    assert.equal(src.includes("@/lib/asset-engine/types"), true);
  });

  it("media-process route GET imports media-queue, not media-process statically", () => {
    const src = readFileSync(
      path.join(root, "app/api/content/media-process/route.ts"),
      "utf8",
    );
    assert.ok(src.includes('from "@/lib/live-portfolio/media-queue"'));
    assert.ok(src.includes("await import("));
    assert.ok(src.includes("@/lib/live-portfolio/media-process"));
    assert.equal(
      src.includes(
        'import {\n  listMediaProcessingQueue,\n  runGalleryMediaProcessing,\n} from "@/lib/live-portfolio/media-process"',
      ),
      false,
    );
    assert.equal(
      /import\s*\{[^}]*runGalleryMediaProcessing/.test(src) &&
        !src.includes("await import("),
      false,
    );
  });

  it("MediaProcessingClient distinguishes load error from empty inventory", () => {
    const src = readFileSync(
      path.join(root, "components/admin/MediaProcessingClient.tsx"),
      "utf8",
    );
    assert.ok(src.includes('loadState === "error"'));
    assert.ok(/empty inventory/i.test(src));
    assert.ok(src.includes("No media inventory rows yet"));
  });
});

describe("media-queue runtime", () => {
  it("exports listMediaProcessingQueue", async () => {
    const mod = await import("./media-queue");
    assert.equal(typeof mod.listMediaProcessingQueue, "function");
  });
});
