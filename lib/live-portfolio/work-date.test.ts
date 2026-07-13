import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  composeProvisionalWorkDate,
  normalizeProvisionalVehicleLabel,
  parseMonthFolder,
  parseVehicleFolder,
} from "./parse-drive-folder";
import {
  isFutureWorkDate,
  looksLikeBareNumericPrefix,
  parseExplicitWorkDate,
  suggestWorkDateFromDriveTimestamp,
} from "./work-date-parser";
import {
  buildWorkDateRepairPatch,
  shouldRepairProvisionalWorkDate,
} from "./work-date-repair";

describe("parseMonthFolder", () => {
  it("parses 2026-07 JULY", () => {
    const parsed = parseMonthFolder("2026-07 JULY");
    assert.equal(parsed.ok, true);
    assert.equal(parsed.year, 2026);
    assert.equal(parsed.month, 7);
    assert.equal(parsed.sortKey, "2026-07");
  });
});

describe("parseVehicleFolder — explicit dates", () => {
  const july = parseMonthFolder("2026-07 JULY");
  const now = new Date("2026-07-11T12:00:00Z");

  it("parses YYYY-MM-DD prefix", () => {
    const parsed = parseVehicleFolder("2026-07-15 Jetta", july, { now });
    assert.equal(parsed.workDate, "2026-07-15");
    assert.equal(parsed.vehicle, "Jetta");
    assert.equal(parsed.dateConfidence, "confirmed");
  });

  it("parses MM-DD-YYYY prefix", () => {
    const parsed = parseVehicleFolder("07-15-2026 Jetta", july, { now });
    assert.equal(parsed.workDate, "2026-07-15");
    assert.equal(parsed.vehicle, "Jetta");
  });

  it("parses YYYYMMDD prefix", () => {
    const parsed = parseVehicleFolder("20260715 Jetta", july, { now });
    assert.equal(parsed.workDate, "2026-07-15");
    assert.equal(parsed.vehicle, "Jetta");
  });

  it("parses MM.DD.YY prefix", () => {
    const parsed = parseVehicleFolder("07.15.26 Jetta", july, { now });
    assert.equal(parsed.workDate, "2026-07-15");
    assert.equal(parsed.vehicle, "Jetta");
  });

  it("parses M-D prefix with month folder year", () => {
    const parsed = parseVehicleFolder("7-15 Jetta", july, { now });
    assert.equal(parsed.workDate, "2026-07-15");
    assert.equal(parsed.vehicle, "Jetta");
  });

  it("allows explicit future dates", () => {
    const parsed = parseVehicleFolder("2026-07-28 Future Job", july, { now });
    assert.equal(parsed.workDate, "2026-07-28");
    assert.equal(isFutureWorkDate(parsed.workDate!, now), true);
  });
});

describe("parseVehicleFolder — bare numeric prefixes", () => {
  const july = parseMonthFolder("2026-07 JULY");
  const now = new Date("2026-07-11T12:00:00Z");

  it("does not treat 26 Expedition as July 26", () => {
    const parsed = parseVehicleFolder("26 Expedition", july, { now });
    assert.equal(parsed.workDate, null);
    assert.equal(parsed.vehicle, "26 Expedition");
    assert.ok(
      parsed.warnings.some((w) => w.code === "needs_date_confirmation"),
    );
  });

  it("does not treat 25 GMC 2500 as a day", () => {
    const parsed = parseVehicleFolder("25 GMC 2500", july, { now });
    assert.equal(parsed.workDate, null);
    assert.equal(parsed.vehicle, "25 GMC 2500");
  });

  it("does not treat 26 Denali as a day", () => {
    const parsed = parseVehicleFolder("26 Denali", july, { now });
    assert.equal(parsed.workDate, null);
    assert.equal(parsed.vehicle, "26 Denali");
  });

  it("does not treat 2011 F250 as a day", () => {
    const parsed = parseVehicleFolder("2011 F250", july, { now });
    assert.equal(parsed.workDate, null);
    assert.equal(parsed.vehicle, "2011 F250");
  });

  it("leaves Corvette without a date", () => {
    const parsed = parseVehicleFolder("Corvette", july, { now });
    assert.equal(parsed.workDate, null);
    assert.ok(parsed.warnings.some((w) => w.code === "no_explicit_date"));
  });

  it("exposes drive timestamp as suggestion only", () => {
    const parsed = parseVehicleFolder("26 Expedition", july, {
      now,
      driveCreatedTime: "2026-07-08T10:00:00Z",
    });
    assert.equal(parsed.workDate, null);
    assert.equal(parsed.suggestedWorkDate, "2026-07-08");
  });
});

describe("work date repair", () => {
  const now = new Date("2026-07-11T12:00:00Z");

  it("repairs legacy day-prefix inference", () => {
    const decision = shouldRepairProvisionalWorkDate(
      {
        id: "a",
        work_date: "2026-07-26",
        provisional_vehicle: true,
        drive_folder_name: "26 Expedition",
        source_month_folder_name: "2026-07 JULY",
        validation_errors: [],
      },
      now,
    );
    assert.equal(decision.repair, true);
    const patch = buildWorkDateRepairPatch(
      {
        id: "a",
        work_date: "2026-07-26",
        provisional_vehicle: true,
        drive_folder_name: "26 Expedition",
        source_month_folder_name: "2026-07 JULY",
        validation_errors: [],
      },
      now,
    );
    assert.equal(patch.nextWorkDate, null);
  });

  it("preserves human-confirmed dates", () => {
    const decision = shouldRepairProvisionalWorkDate(
      {
        id: "a",
        work_date: "2026-07-26",
        provisional_vehicle: false,
        drive_folder_name: "26 Expedition",
        source_month_folder_name: "2026-07 JULY",
        validation_errors: [],
      },
      now,
    );
    assert.equal(decision.repair, false);
  });

  it("preserves explicit future dates", () => {
    const decision = shouldRepairProvisionalWorkDate(
      {
        id: "a",
        work_date: "2026-07-28",
        provisional_vehicle: true,
        drive_folder_name: "2026-07-28 Expedition",
        source_month_folder_name: "2026-07 JULY",
        validation_errors: [],
      },
      now,
    );
    assert.equal(decision.repair, false);
  });
});

describe("helpers", () => {
  it("detects bare numeric prefixes", () => {
    assert.equal(looksLikeBareNumericPrefix("26 Expedition"), true);
    assert.equal(looksLikeBareNumericPrefix("Corvette"), false);
  });

  it("suggests month-aligned drive timestamps", () => {
    const month = parseMonthFolder("2026-07 JULY");
    assert.equal(
      suggestWorkDateFromDriveTimestamp("2026-07-08T10:00:00Z", month),
      "2026-07-08",
    );
  });

  it("composes provisional work date", () => {
    const month = parseMonthFolder("2026-07 JULY");
    assert.equal(composeProvisionalWorkDate(month, 26), "2026-07-26");
    assert.equal(normalizeProvisionalVehicleLabel("  ZR2   Sport  "), "ZR2 Sport");
  });
});
