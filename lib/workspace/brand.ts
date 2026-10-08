/**
 * Minimal deployment brand configuration for KXD Automotive Client OS.
 *
 * Phase 1: consumed by the authenticated shell lockup only.
 * Not a theming engine, tenant system, or database-backed config.
 */

export type WorkspaceBusinessType =
  | "tint"
  | "detail"
  | "wrap"
  | "custom"
  | "performance"
  | "service";

export type WorkspaceBrand = {
  /** Primary shop / product name shown in the shell. */
  brandName: string;
  /**
   * Optional kicker — reserved for future deploy config.
   * Not shown in the AutoDV8ions shell (mark + brandName only).
   */
  workspaceLabel: string;
  /** Square or compact mark for rail / mobile identity. */
  logoMark: string;
  /** Optional horizontal wordmark (print / login may use later). */
  logoWordmark: string;
  /** Brand accent hex — maps to restrained red in AD8. */
  accent: string;
  /** Support / sales mailbox for reconnect copy (future shell use). */
  supportEmail: string;
  /** Shop category — copy/defaults later; unused by Phase 1 UI. */
  businessType: WorkspaceBusinessType;
};

/**
 * AutoDV8ions deployment brand.
 * Future deployments swap this module or override via a later config path.
 */
export const workspaceBrand: WorkspaceBrand = {
  brandName: "AutoDV8ions",
  workspaceLabel: "",
  /** Square mark — readable at ~52–56px in the shell rail. */
  logoMark: "/images/logos/autodv8ions-hero-logo.png",
  /** Wide wordmark — print / marketing surfaces. */
  logoWordmark: "/images/logos/dv8-logo.png",
  accent: "#d30b0b",
  supportEmail: "sales@autodv8ions.com",
  businessType: "tint",
};

export function getWorkspaceBrand(): WorkspaceBrand {
  return workspaceBrand;
}
