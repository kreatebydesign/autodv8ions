import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  buildGenerateLeadPayload,
  getGaMeasurementId,
  shouldLoadGoogleAnalytics,
  trackEmailClick,
  trackGenerateLead,
  trackPhoneClick,
} from "./gtag";
import { inquiryTypeToServiceType } from "./service-type";

describe("analytics service_type mapping", () => {
  it("maps inquiry types to generate_lead service_type values", () => {
    assert.equal(inquiryTypeToServiceType("remote_starter"), "remote_starter");
    assert.equal(
      inquiryTypeToServiceType("vehicle_security"),
      "vehicle_security",
    );
    assert.equal(inquiryTypeToServiceType("audio_custom"), "audio_custom");
    assert.equal(
      inquiryTypeToServiceType("general_contact"),
      "general_contact",
    );
  });
});

describe("buildGenerateLeadPayload", () => {
  it("includes only categorical params", () => {
    assert.deepEqual(
      buildGenerateLeadPayload({
        service_type: "tint_quote",
        form_id: "tint_quote",
        page_path: "/tint-quote",
      }),
      {
        service_type: "tint_quote",
        form_id: "tint_quote",
        page_path: "/tint-quote",
      },
    );
  });

  it("omits optional params when absent", () => {
    assert.deepEqual(
      buildGenerateLeadPayload({ service_type: "general_contact" }),
      { service_type: "general_contact" },
    );
  });

  it("never includes PII field names in the payload shape", () => {
    const payload = buildGenerateLeadPayload({
      service_type: "remote_starter",
      form_id: "inquiry_form",
      page_path: "/services/remote-starters",
    });
    const forbidden = [
      "email",
      "phone",
      "name",
      "first_name",
      "last_name",
      "firstName",
      "lastName",
      "message",
      "vin",
      "address",
      "customer_id",
      "job_id",
    ];
    for (const key of forbidden) {
      assert.equal(Object.hasOwn(payload, key), false);
    }
  });
});

describe("gtag helpers", () => {
  const originalGa = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalPublicVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;

  afterEach(() => {
    if (originalGa === undefined) {
      delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    } else {
      process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = originalGa;
    }
    if (originalVercelEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = originalVercelEnv;
    }
    if (originalPublicVercelEnv === undefined) {
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    } else {
      process.env.NEXT_PUBLIC_VERCEL_ENV = originalPublicVercelEnv;
    }
    // @ts-expect-error test cleanup
    delete globalThis.window;
  });

  it("reads measurement id from env", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    assert.equal(getGaMeasurementId(), "G-4JHS85FNCR");
  });

  it("does not load GA without measurement id", () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    process.env.VERCEL_ENV = "production";
    assert.equal(shouldLoadGoogleAnalytics(), false);
  });

  it("does not load GA on localhost (no VERCEL_ENV)", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    delete process.env.VERCEL_ENV;
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    assert.equal(shouldLoadGoogleAnalytics(), false);
  });

  it("does not load GA on Vercel Preview", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    process.env.VERCEL_ENV = "preview";
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    assert.equal(shouldLoadGoogleAnalytics(), false);
  });

  it("loads GA only on Vercel Production", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    process.env.VERCEL_ENV = "production";
    delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    assert.equal(shouldLoadGoogleAnalytics(), true);
  });

  it("no-ops event helpers when gtag is unavailable", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    assert.doesNotThrow(() => {
      trackGenerateLead({ service_type: "tint_quote" });
      trackPhoneClick({ link_location: "footer" });
      trackEmailClick({ link_location: "contact" });
    });
  });

  it("sends PII-safe events through window.gtag when available", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    const calls: unknown[][] = [];
    // @ts-expect-error test stub
    globalThis.window = {
      gtag: (...args: unknown[]) => {
        calls.push(args);
      },
    };

    trackGenerateLead({
      service_type: "tint_quote",
      form_id: "tint_quote",
      page_path: "/tint-quote",
    });
    trackPhoneClick({ link_location: "footer" });
    trackEmailClick({ link_location: "contact" });

    assert.deepEqual(calls, [
      [
        "event",
        "generate_lead",
        {
          service_type: "tint_quote",
          form_id: "tint_quote",
          page_path: "/tint-quote",
        },
      ],
      ["event", "phone_click", { link_location: "footer" }],
      ["event", "email_click", { link_location: "contact" }],
    ]);
  });
});

describe("one-shot lead guard pattern", () => {
  it("fires generate_lead only once when guarded by a ref flag", () => {
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-4JHS85FNCR";
    const calls: unknown[][] = [];
    // @ts-expect-error test stub
    globalThis.window = {
      gtag: (...args: unknown[]) => {
        calls.push(args);
      },
    };

    let fired = false;
    function fireOnce() {
      if (fired) return;
      fired = true;
      trackGenerateLead({
        service_type: "general_contact",
        form_id: "inquiry_form",
        page_path: "/contact",
      });
    }

    fireOnce();
    fireOnce();
    fireOnce();

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], [
      "event",
      "generate_lead",
      {
        service_type: "general_contact",
        form_id: "inquiry_form",
        page_path: "/contact",
      },
    ]);
  });
});
