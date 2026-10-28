"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import InquiryForm from "@/components/site/InquiryForm";
import { scrollToRemoteStarterConsultation } from "@/components/site/remote-starter-scroll";
import {
  COMPUSTAR_REMOTE_STARTER_PRODUCTS,
  getEnabledCompustarProducts,
} from "@/lib/constants/compustar-remote-starters";
import { REMOTE_STARTER_INSTALL_PACKAGES } from "@/lib/constants/remote-starter-packages";
import {
  REMOTE_STARTER_INQUIRY_LABEL,
  REMOTE_STARTER_PRODUCT_CATALOG_ENABLED,
} from "@/lib/constants/remote-starter-page";

const DRONEMOBILE_INTEREST = "DroneMobile smartphone add-on";

function resolveSystemInterest(
  systemId: string | null,
  interest: string | null,
): string | undefined {
  if (systemId) {
    const product = COMPUSTAR_REMOTE_STARTER_PRODUCTS.find(
      (item) => item.id === systemId,
    );
    if (product) return product.name;
  }
  if (interest) {
    const decoded = decodeURIComponent(interest).trim();
    if (!decoded) return undefined;
    const compustar = COMPUSTAR_REMOTE_STARTER_PRODUCTS.find(
      (item) =>
        item.id === decoded ||
        item.name.toLowerCase() === decoded.toLowerCase(),
    );
    if (compustar) return compustar.name;
    const packageMatch = REMOTE_STARTER_INSTALL_PACKAGES.find(
      (item) => item.title.toLowerCase() === decoded.toLowerCase(),
    );
    if (packageMatch) return packageMatch.title;
    if (decoded.toLowerCase() === "dronemobile") return DRONEMOBILE_INTEREST;
    return decoded;
  }
  return undefined;
}

/**
 * Single client boundary for consultation copy + form so useSearchParams
 * suspends once (avoids mismatched Suspense fallbacks during hydration).
 */
export default function RemoteStarterConsultation() {
  const searchParams = useSearchParams();
  const systemId = searchParams.get("system");
  const interest = searchParams.get("interest");

  const systemInterest = useMemo(
    () =>
      REMOTE_STARTER_PRODUCT_CATALOG_ENABLED
        ? resolveSystemInterest(systemId, interest)
        : undefined,
    [systemId, interest],
  );

  const compustarNames = useMemo(
    () =>
      getEnabledCompustarProducts()
        .map((product) => product.name)
        .join(", "),
    [],
  );

  useEffect(() => {
    if (!systemId && !interest && window.location.hash !== "#consultation") {
      return;
    }
    requestAnimationFrame(() => scrollToRemoteStarterConsultation());
  }, [systemId, interest]);

  return (
    <>
      <div className="lg:col-span-5">
        {!REMOTE_STARTER_PRODUCT_CATALOG_ENABLED ? (
          <>
            <p className="label-mono mb-4 text-white/40">
              {REMOTE_STARTER_INQUIRY_LABEL}
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Send us a message
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Name, email, phone, and your vehicle year, make, and model help us
              answer faster. Tell us what you are trying to do (winter warm-up,
              scheduling, fitment questions) and we will follow up from the shop.
            </p>
          </>
        ) : (
          <>
            <p className="label-mono mb-4 text-white/40">Get a quote</p>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Send us your vehicle info
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Year, make, model, and how you&apos;d like to use the remote start.
              {systemInterest ? (
                <>
                  {" "}
                  You picked{" "}
                  <span className="text-white/60">{systemInterest}</span>. We
                  will start there when we call you back.
                </>
              ) : (
                <>
                  {" "}
                  Mention a Compustar model ({compustarNames}), DroneMobile, or
                  one of our usual install packages if you already know what you
                  want. We check fitment first, then send a real quote for your
                  vehicle.
                </>
              )}
            </p>
          </>
        )}
      </div>
      <div className="lg:col-span-7">
        <InquiryForm
          key={systemInterest ?? "remote-starter-inquiry"}
          inquiryType="remote_starter"
          pageSource="/services/remote-starters"
          initialSystemInterest={systemInterest}
          lineupRefreshMode={!REMOTE_STARTER_PRODUCT_CATALOG_ENABLED}
        />
      </div>
    </>
  );
}
