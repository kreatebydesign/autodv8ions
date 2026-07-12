import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { verifyLivePortfolioSchema } from "./drive-import-pending";

function mockSupabase(opts: {
  itemsError?: { message: string } | null;
  mediaError?: { message: string } | null;
}): SupabaseClient {
  return {
    from(table: string) {
      return {
        select() {
          return {
            limit() {
              if (table === "gallery_items") {
                return Promise.resolve({
                  data: opts.itemsError ? null : [],
                  error: opts.itemsError || null,
                });
              }
              if (table === "gallery_media") {
                return Promise.resolve({
                  data: opts.mediaError ? null : [],
                  error: opts.mediaError || null,
                });
              }
              return Promise.resolve({ data: null, error: { message: "unknown" } });
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
}

describe("verifyLivePortfolioSchema", () => {
  it("passes when gallery_items and gallery_media probes succeed", async () => {
    const result = await verifyLivePortfolioSchema(mockSupabase({}));
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.checked.includes("gallery_items"));
      assert.ok(result.checked.includes("gallery_media"));
    }
  });

  it("fails closed when gallery_media is missing", async () => {
    const result = await verifyLivePortfolioSchema(
      mockSupabase({
        mediaError: { message: "relation gallery_media does not exist" },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "schema_missing");
      assert.ok(result.missing.includes("gallery_media"));
    }
  });

  it("fails closed when gallery_items Phase 0 columns are missing", async () => {
    const result = await verifyLivePortfolioSchema(
      mockSupabase({
        itemsError: { message: "column drive_folder_id does not exist" },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "schema_missing");
      assert.ok(result.missing.some((m) => m.includes("gallery_items")));
    }
  });
});
