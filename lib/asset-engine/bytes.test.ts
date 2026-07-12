import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { Readable } from "node:stream";
import { toOwnedNodeBuffer } from "./bytes";
import { sha256Readable } from "./checksum";
import { processImageBuffer } from "./processing/image";

describe("toOwnedNodeBuffer", () => {
  it("copies Buffer into a new owned Buffer", () => {
    const original = Buffer.from([1, 2, 3, 4]);
    const owned = toOwnedNodeBuffer(original);
    assert.ok(Buffer.isBuffer(owned));
    assert.notEqual(owned, original);
    assert.deepEqual([...owned], [1, 2, 3, 4]);
    original[0] = 99;
    assert.equal(owned[0], 1);
  });

  it("copies Uint8Array views without requiring SharedArrayBuffer support", () => {
    const ab = new ArrayBuffer(4);
    const view = new Uint8Array(ab);
    view.set([9, 8, 7, 6]);
    const owned = toOwnedNodeBuffer(view);
    assert.ok(Buffer.isBuffer(owned));
    assert.deepEqual([...owned], [9, 8, 7, 6]);
  });

  it("copies SharedArrayBuffer-backed Uint8Array when SAB is available", () => {
    if (typeof SharedArrayBuffer === "undefined") {
      return;
    }
    const sab = new SharedArrayBuffer(4);
    const view = new Uint8Array(sab);
    view.set([5, 4, 3, 2]);
    const owned = toOwnedNodeBuffer(view);
    assert.ok(Buffer.isBuffer(owned));
    assert.deepEqual([...owned], [5, 4, 3, 2]);
    // Underlying buffer must not be the SharedArrayBuffer.
    assert.equal(owned.buffer instanceof SharedArrayBuffer, false);
  });

  it("accepts SharedArrayBuffer directly when available", () => {
    if (typeof SharedArrayBuffer === "undefined") {
      return;
    }
    const sab = new SharedArrayBuffer(3);
    new Uint8Array(sab).set([1, 2, 3]);
    const owned = toOwnedNodeBuffer(sab);
    assert.deepEqual([...owned], [1, 2, 3]);
  });
});

describe("stream checksum SAB-safe conversion", () => {
  it("hashes SAB-like Uint8Array stream chunks into an owned Buffer", async () => {
    const chunks: Uint8Array[] = [];
    if (typeof SharedArrayBuffer !== "undefined") {
      const sab = new SharedArrayBuffer(3);
      const view = new Uint8Array(sab);
      view.set([10, 20, 30]);
      chunks.push(view);
    } else {
      chunks.push(Uint8Array.from([10, 20, 30]));
    }

    const stream = Readable.from(chunks);
    const result = await sha256Readable(stream, { maxBytes: 1024 });
    assert.ok(Buffer.isBuffer(result.buffer));
    assert.deepEqual([...result.buffer], [10, 20, 30]);
    assert.equal(result.byteLength, 3);
    assert.match(result.checksumSha256, /^[a-f0-9]{64}$/);
  });
});

describe("sharp receives owned Buffer", () => {
  it("processes image from Uint8Array-backed input without SAB errors", async () => {
    const jpeg = await sharp({
      create: {
        width: 32,
        height: 24,
        channels: 3,
        background: { r: 12, g: 34, b: 56 },
      },
    })
      .jpeg()
      .toBuffer();

    // Simulate a non-Buffer typed array input path.
    const asUint8 = Uint8Array.from(jpeg);
    const processed = await processImageBuffer(asUint8, {
      mimeType: "image/jpeg",
    });
    assert.equal(processed.width, 32);
    assert.equal(processed.height, 24);
    assert.equal(processed.variants.length, 4);
    assert.ok(Buffer.isBuffer(processed.variants[0].buffer));
  });
});
