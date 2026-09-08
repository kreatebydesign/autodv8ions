import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveSyncLifecycleFields,
  resolveSyncVehicleAndWorkDate,
  shouldPreserveHumanEditedMetadata,
  shouldPreserveLifecycle,
  shouldWithholdNewMediaForParent,
} from "./sync-preserve";

describe("sync preserve lifecycle", () => {
  it("preserves published status and published flag", () => {
    const existing = { status: "published", published: true, vehicle: "Tesla" };
    assert.equal(shouldPreserveLifecycle(existing), true);
    assert.deepEqual(resolveSyncLifecycleFields(existing), {
      status: "published",
      published: true,
    });
  });

  it("preserves pending_review without forcing published false demotion", () => {
    const existing = {
      status: "pending_review",
      published: false,
      provisional_vehicle: true,
    };
    assert.deepEqual(resolveSyncLifecycleFields(existing), {
      status: "pending_review",
      published: false,
    });
  });

  it("preserves draft and archived_review", () => {
    assert.deepEqual(
      resolveSyncLifecycleFields({ status: "draft", published: false }),
      { status: "draft", published: false },
    );
    assert.deepEqual(
      resolveSyncLifecycleFields({ status: "archived_review", published: false }),
      { status: "archived_review", published: false },
    );
  });

  it("new items default to pending_review unpublished", () => {
    assert.deepEqual(resolveSyncLifecycleFields(null), {
      status: "pending_review",
      published: false,
    });
  });

  it("never demotes published to pending", () => {
    const next = resolveSyncLifecycleFields({
      status: "published",
      published: true,
    });
    assert.notEqual(next.status, "pending");
    assert.equal(next.published, true);
  });
});

describe("sync preserve human-edited metadata", () => {
  it("locks vehicle/work_date for published items", () => {
    const existing = {
      status: "published",
      published: true,
      provisional_vehicle: false,
      vehicle: "Curated Tesla",
      work_date: "2026-01-15",
    };
    assert.equal(shouldPreserveHumanEditedMetadata(existing), true);
    assert.deepEqual(
      resolveSyncVehicleAndWorkDate(existing, {
        vehicle: "Drive Rename",
        workDate: "2026-09-01",
      }),
      { vehicle: "Curated Tesla", workDate: "2026-01-15" },
    );
  });

  it("allows provisional pending_review vehicle refresh from Drive", () => {
    const existing = {
      status: "pending_review",
      published: false,
      provisional_vehicle: true,
      vehicle: "Old Label",
      work_date: null,
    };
    assert.equal(shouldPreserveHumanEditedMetadata(existing), false);
    assert.deepEqual(
      resolveSyncVehicleAndWorkDate(existing, {
        vehicle: "26 RAM 1500",
        workDate: "2026-09-08",
      }),
      { vehicle: "26 RAM 1500", workDate: "2026-09-08" },
    );
  });
});

describe("withhold new media for curated parents", () => {
  it("withholds for published and curated statuses", () => {
    assert.equal(
      shouldWithholdNewMediaForParent({
        status: "published",
        published: true,
      }),
      true,
    );
    assert.equal(
      shouldWithholdNewMediaForParent({
        status: "approved",
        published: false,
      }),
      true,
    );
    assert.equal(
      shouldWithholdNewMediaForParent({
        status: "draft",
        published: false,
      }),
      true,
    );
    assert.equal(
      shouldWithholdNewMediaForParent({
        status: "archived_review",
        published: false,
      }),
      true,
    );
  });

  it("allows provisional pending_review parents", () => {
    assert.equal(
      shouldWithholdNewMediaForParent({
        status: "pending_review",
        published: false,
        provisional_vehicle: true,
      }),
      false,
    );
  });

  it("withholds human-confirmed pending_review (provisional_vehicle false)", () => {
    assert.equal(
      shouldWithholdNewMediaForParent({
        status: "pending_review",
        published: false,
        provisional_vehicle: false,
      }),
      true,
    );
  });
});
