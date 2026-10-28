"use client";

import { useEffect } from "react";
import {
  isRemoteStarterConsultationHref,
  isRemoteStarterPagePath,
  normalizeSitePathname,
  parseRemoteStarterConsultationHref,
  scheduleScrollToRemoteStarterConsultation,
} from "@/components/site/remote-starter-scroll";

export default function RemoteStarterHashScroll() {
  useEffect(() => {
    function scrollIfNeeded() {
      if (window.location.hash !== "#consultation") return;
      scheduleScrollToRemoteStarterConsultation();
    }

    scrollIfNeeded();

    function onHashChange() {
      scrollIfNeeded();
    }

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!isRemoteStarterConsultationHref(href)) return;
      if (!href) return;

      const url = parseRemoteStarterConsultationHref(href);
      const currentPath = normalizeSitePathname(window.location.pathname);
      const currentSearch = window.location.search;

      // Query changes must use Next.js navigation so inquiry prefill re-renders.
      if (
        isRemoteStarterPagePath(currentPath) &&
        url.pathname === currentPath &&
        url.search !== currentSearch
      ) {
        return;
      }

      // Same page, same query: handle scroll ourselves (App Router often skips hash scroll).
      if (
        isRemoteStarterPagePath(currentPath) &&
        url.pathname === currentPath &&
        url.search === currentSearch &&
        url.hash === "#consultation"
      ) {
        event.preventDefault();
        const next = `${url.pathname}${url.search}${url.hash}`;
        const current = `${currentPath}${currentSearch}${window.location.hash}`;
        if (current !== next) {
          window.history.pushState(null, "", next);
        }
        scheduleScrollToRemoteStarterConsultation();
      }
    }

    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
