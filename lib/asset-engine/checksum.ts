import { createHash } from "node:crypto";
import type { Readable } from "node:stream";
import { toOwnedNodeBuffer } from "./bytes";

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(toOwnedNodeBuffer(buffer)).digest("hex");
}

export async function sha256Readable(
  stream: Readable,
  options: { maxBytes: number; onChunk?: (chunk: Buffer) => void } = {
    maxBytes: Number.POSITIVE_INFINITY,
  },
): Promise<{ checksumSha256: string; byteLength: number; buffer: Buffer }> {
  const hash = createHash("sha256");
  const chunks: Buffer[] = [];
  let byteLength = 0;

  for await (const chunk of stream) {
    // Always copy — Drive/undici chunks may be SAB-backed Uint8Arrays.
    const buf = toOwnedNodeBuffer(chunk);
    byteLength += buf.length;
    if (byteLength > options.maxBytes) {
      throw new Error(
        `Asset exceeds maxBytes limit (${options.maxBytes} bytes).`,
      );
    }
    hash.update(buf);
    options.onChunk?.(buf);
    chunks.push(buf);
  }

  const concatenated = Buffer.concat(chunks, byteLength);
  // Final owned copy so callers never hold concat internals that might share views.
  const buffer = toOwnedNodeBuffer(concatenated);

  return {
    checksumSha256: hash.digest("hex"),
    byteLength: buffer.byteLength,
    buffer,
  };
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return ba.equals(bb);
  } catch {
    return false;
  }
}
