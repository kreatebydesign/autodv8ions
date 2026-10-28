"use client";

import { useEffect } from "react";
import { scrollToPageHash } from "@/components/site/scroll-to-page-hash";
import { REMOTE_STARTER_CONTACT_HASH } from "@/lib/constants/remote-starter-page";

/** Scroll to the inquiry form when the page loads with `#remote-starter-contact`. */
export default function RemoteStarterContactHashOnLoad() {
  useEffect(() => {
    if (window.location.hash !== REMOTE_STARTER_CONTACT_HASH) return;
    requestAnimationFrame(() => {
      scrollToPageHash(REMOTE_STARTER_CONTACT_HASH);
    });
  }, []);

  return null;
}
