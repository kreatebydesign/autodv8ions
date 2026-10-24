"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import InquiryForm from "@/components/site/InquiryForm";
import {
  COMPUSTAR_REMOTE_STARTER_PRODUCTS,
  getEnabledCompustarProducts,
} from "@/lib/constants/compustar-remote-starters";
import { REMOTE_STARTER_INSTALL_PACKAGES } from "@/lib/constants/remote-starter-packages";

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

export default function RemoteStarterInquirySection() {
  const searchParams = useSearchParams();
  const systemId = searchParams.get("system");
  const interest = searchParams.get("interest");

  const systemInterest = useMemo(
    () => resolveSystemInterest(systemId, interest),
    [systemId, interest],
  );

  const compustarNames = useMemo(
    () =>
      getEnabledCompustarProducts()
        .map((product) => product.name)
        .join(", "),
    [],
  );

  return (
    <>
      <p className="label-mono mb-4 text-white/40">Request a quote</p>
      <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
        Tell us about your vehicle
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-white/45">
        Share year, make, model, and any Compustar system you are considering
        {systemInterest ? (
          <>
            {" "}
            — we&apos;ve noted{" "}
            <span className="text-white/60">{systemInterest}</span> from your
            selection.
          </>
        ) : (
          <>
            {" "}
            ({compustarNames}, DroneMobile, or our in-shop install paths). We
            review compatibility for Altoona-area installs and follow up with a
            tailored quote — not a menu price.
          </>
        )}
      </p>
    </>
  );
}

export function RemoteStarterInquiryForm() {
  const searchParams = useSearchParams();
  const systemId = searchParams.get("system");
  const interest = searchParams.get("interest");
  const systemInterest = useMemo(
    () => resolveSystemInterest(systemId, interest),
    [systemId, interest],
  );

  useEffect(() => {
    if (!systemId && !interest) return;
    const node = document.getElementById("consultation");
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [systemId, interest]);

  return (
    <InquiryForm
      key={systemInterest ?? "remote-starter-inquiry"}
      inquiryType="remote_starter"
      pageSource="/services/remote-starters"
      initialSystemInterest={systemInterest}
    />
  );
}
