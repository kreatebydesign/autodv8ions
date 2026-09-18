import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import { decryptSecret, encryptSecret } from "./gmail-crypto";

describe("gmail credential encryption", () => {
  const previousSecret = process.env.ADMIN_SESSION_SECRET;

  before(() => {
    process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-for-crypto";
  });

  after(() => {
    if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previousSecret;
  });

  it("round-trips secrets without exposing plaintext in the ciphertext envelope", async () => {
    const plaintext = "1//example-refresh-token-value";
    const encrypted = await encryptSecret(plaintext);
    assert.match(encrypted, /^v1\./);
    assert.doesNotMatch(encrypted, /example-refresh-token-value/);
    const decrypted = await decryptSecret(encrypted);
    assert.equal(decrypted, plaintext);
  });
});
