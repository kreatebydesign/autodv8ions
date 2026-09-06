import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  asNullableString,
  buildInquiryCustomerNotes,
  buildTintCustomerNotes,
  hasVehicleData,
  inquiryServiceType,
  isUuid,
} from "./website-lead";

describe("website-lead helpers", () => {
  it("maps inquiry types to Command Center service types", () => {
    assert.equal(inquiryServiceType("remote_starter"), "Remote Starter");
    assert.equal(inquiryServiceType("vehicle_security"), "Alarm / Security");
    assert.equal(inquiryServiceType("audio_custom"), "Custom Mod");
    assert.equal(inquiryServiceType("general_contact"), "Other");
  });

  it("detects vehicle data without fabricating fields", () => {
    assert.equal(hasVehicleData({}), false);
    assert.equal(hasVehicleData({ year: "2019" }), true);
    assert.equal(hasVehicleData({ make: "Ford", model: "" }), true);
  });

  it("builds inquiry notes from available fields only", () => {
    const notes = buildInquiryCustomerNotes(
      {
        message: "Need remote start",
        timeline: "This month",
      },
      "remote_starter",
    );
    assert.match(notes, /Inquiry type: remote_starter/);
    assert.match(notes, /Need remote start/);
    assert.match(notes, /Timeline: This month/);
    assert.doesNotMatch(notes, /Budget range/);
  });

  it("includes audio acceptance note for audio_custom", () => {
    const notes = buildInquiryCustomerNotes({}, "audio_custom");
    assert.match(notes, /does not guarantee acceptance/);
  });

  it("builds tint notes without empty lines for missing fields", () => {
    const notes = buildTintCustomerNotes({
      tintScope: "Full vehicle",
      contactMethod: "Text",
    });
    assert.equal(notes, "Tint scope: Full vehicle\nContact via: Text");
  });

  it("normalizes nullable strings and uuid checks", () => {
    assert.equal(asNullableString("  "), null);
    assert.equal(asNullableString("a@b.com"), "a@b.com");
    assert.equal(isUuid("4fd150a8-2806-4315-9d75-569c5b7f4a77"), true);
    assert.equal(isUuid("not-a-uuid"), false);
  });
});
