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
 * Authenticated-shell brand lockup.
 * Mark + brand name only — no user-facing "Workspace" kicker.
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
        <p className="dash-brand-lockup-title">{brand.brandName}</p>
      </div>
    </div>
  );
}
