import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

describe("portfolio lifecycle route sharp isolation", () => {
  it("does not statically import media-process, asset-engine, or sharp", () => {
    const src = readFileSync(
      path.join(root, "app/api/portfolio/lifecycle/route.ts"),
      "utf8",
    );
    assert.equal(src.includes('from "@/lib/live-portfolio/media-process"'), false);
    assert.equal(src.includes('from "@/lib/asset-engine"'), false);
    assert.equal(src.includes('from "sharp"'), false);
    assert.ok(src.includes("await import("));
    assert.ok(src.includes("@/lib/live-portfolio/media-process"));
  });

  it("only dynamic-imports media processing inside the reprocess branch", () => {
    const src = readFileSync(
      path.join(root, "app/api/portfolio/lifecycle/route.ts"),
      "utf8",
    );
    const reprocessIdx = src.indexOf("restored.needsReprocess");
    const dynamicIdx = src.indexOf('await import(');
    const mediaProcessIdx = src.indexOf("@/lib/live-portfolio/media-process");
    assert.ok(reprocessIdx > 0, "reprocess gate missing");
    assert.ok(dynamicIdx > reprocessIdx, "dynamic import must follow reprocess gate");
    assert.ok(
      mediaProcessIdx > dynamicIdx,
      "media-process path must be the dynamic import target",
    );
  });
});

describe("next.config sharp linux tracing", () => {
  it("traces linux-x64 sharp and libvips into media-process and lifecycle", () => {
    const src = readFileSync(path.join(root, "next.config.ts"), "utf8");
    assert.ok(src.includes("serverExternalPackages"));
    assert.ok(src.includes('"sharp"') || src.includes("'sharp'"));
    assert.ok(src.includes("outputFileTracingIncludes"));
    assert.ok(src.includes("@img/sharp-libvips-linux-x64"));
    assert.ok(src.includes("@img/sharp-linux-x64"));
    assert.ok(src.includes("/api/content/media-process"));
    assert.ok(src.includes("/api/portfolio/lifecycle"));
  });
});
