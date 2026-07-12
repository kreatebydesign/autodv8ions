import { createHash } from "node:crypto";
import type { Readable } from "node:stream";

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
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
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
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

  return {
    checksumSha256: hash.digest("hex"),
    byteLength,
    buffer: Buffer.concat(chunks, byteLength),
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
