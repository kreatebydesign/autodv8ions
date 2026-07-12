/**
 * Convert arbitrary binary inputs into an owned Node.js Buffer.
 *
 * Vercel / undici / googleapis streams may emit Uint8Array views over
 * SharedArrayBuffer. Passing those to Buffer.from(), sharp(), or Blob APIs
 * can throw: "ArrayBuffer: SharedArrayBuffer is not allowed."
 *
 * Always copy into a freshly allocated Buffer backed by a normal ArrayBuffer.
 */
export function toOwnedNodeBuffer(input: unknown): Buffer {
  if (input == null) {
    throw new Error("Cannot convert empty binary input to Buffer.");
  }

  if (typeof input === "string") {
    return Buffer.from(input);
  }

  if (Buffer.isBuffer(input)) {
    const owned = Buffer.allocUnsafe(input.byteLength);
    input.copy(owned);
    return owned;
  }

  if (input instanceof Uint8Array) {
    const owned = Buffer.allocUnsafe(input.byteLength);
    owned.set(input);
    return owned;
  }

  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const owned = Buffer.allocUnsafe(bytes.byteLength);
    owned.set(bytes);
    return owned;
  }

  if (input instanceof ArrayBuffer) {
    const bytes = new Uint8Array(input);
    const owned = Buffer.allocUnsafe(bytes.byteLength);
    owned.set(bytes);
    return owned;
  }

  if (
    typeof SharedArrayBuffer !== "undefined" &&
    input instanceof SharedArrayBuffer
  ) {
    const bytes = new Uint8Array(input);
    const owned = Buffer.allocUnsafe(bytes.byteLength);
    owned.set(bytes);
    return owned;
  }

  if (Array.isArray(input)) {
    return Buffer.from(input as number[]);
  }

  throw new Error(
    `Unsupported binary input type for Buffer conversion: ${Object.prototype.toString.call(input)}`,
  );
}

/** True when the value looks like binary data we can normalize. */
export function isBinaryLike(input: unknown): boolean {
  return (
    Buffer.isBuffer(input) ||
    input instanceof Uint8Array ||
    input instanceof ArrayBuffer ||
    (typeof SharedArrayBuffer !== "undefined" &&
      input instanceof SharedArrayBuffer) ||
    ArrayBuffer.isView(input)
  );
}
