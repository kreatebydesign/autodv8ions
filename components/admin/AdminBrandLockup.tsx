import Image from "next/image";
import { getWorkspaceBrand } from "@/lib/workspace/brand";

type AdminBrandLockupProps = {
  /** Desktop rail uses a larger mark; mobile bar stays compact. */
  size?: "rail" | "mobile";
};

/** Intrinsic image pixels — display size is CSS-controlled for responsive rail. */
const MARK_INTRINSIC = {
  rail: 52,
  mobile: 36,
} as const;

/**
 * Shared authenticated-shell brand lockup.
 * Driven by workspace brand config — not a multi-tenant theme system.
 *
 * On viewports <1024px, the rail lockup is CSS-quieted so the persistent
 * mobile bar remains the primary brand moment (desktop rail stays 52px).
 */
export default function AdminBrandLockup({
  size = "rail",
}: AdminBrandLockupProps) {
  const brand = getWorkspaceBrand();
  const intrinsic = MARK_INTRINSIC[size];

  return (
    <div className={`dash-brand-lockup dash-brand-lockup--${size}`}>
      <div className="dash-brand-lockup-mark">
        <Image
          src={brand.logoMark}
          alt={brand.brandName}
          width={intrinsic}
          height={intrinsic}
          className="dash-brand-lockup-img"
          priority={size === "rail"}
        />
      </div>
      <div className="dash-brand-lockup-copy">
        <p className="dash-brand-lockup-kicker">{brand.workspaceLabel}</p>
        <p className="dash-brand-lockup-title">{brand.brandName}</p>
      </div>
    </div>
  );
}
