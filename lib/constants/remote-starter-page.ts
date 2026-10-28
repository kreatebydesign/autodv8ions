/**
 * Toggle product grid and install-package cards on `/services/remote-starters`.
 * Product data in `compustar-remote-starters.ts` and `remote-starter-packages.ts` stays intact.
 */
export const REMOTE_STARTER_PRODUCT_CATALOG_ENABLED = false;

export const REMOTE_STARTER_INQUIRY_LABEL = "Remote Starter Inquiry";

/** Bottom inquiry form anchor on `/services/remote-starters`. */
export const REMOTE_STARTER_CONTACT_ID = "remote-starter-contact";

export const REMOTE_STARTER_CONTACT_HASH = `#${REMOTE_STARTER_CONTACT_ID}`;

export const REMOTE_STARTER_CONTACT_HREF = `/services/remote-starters${REMOTE_STARTER_CONTACT_HASH}`;

/** @deprecated Use {@link REMOTE_STARTER_CONTACT_HREF} */
export const REMOTE_STARTER_CONSULTATION_HASH = REMOTE_STARTER_CONTACT_HASH;

/** @deprecated Use {@link REMOTE_STARTER_CONTACT_HREF} */
export const REMOTE_STARTER_CONSULTATION_HREF = REMOTE_STARTER_CONTACT_HREF;
