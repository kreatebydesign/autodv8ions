"use client";

import { useEffect } from "react";
import {
  isRemoteStarterConsultationHref,
  scrollToRemoteStarterConsultation,
} from "@/components/site/remote-starter-scroll";

export default function RemoteStarterHashScroll() {
  useEffect(() => {
    function scrollIfNeeded() {
      if (window.location.hash !== "#consultation") return;
      requestAnimationFrame(() => {
        scrollToRemoteStarterConsultation();
      });
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

      const url = new URL(href, window.location.origin);
      const current = new URL(window.location.href);
      if (url.pathname !== current.pathname) return;

      // Query changes must use Next.js navigation so inquiry prefill re-renders.
      if (url.search !== current.search) return;

      if (url.hash !== "#consultation") return;

      event.preventDefault();
      const next = `${url.pathname}${url.search}${url.hash}`;
      if (`${current.pathname}${current.search}${current.hash}` !== next) {
        window.history.pushState(null, "", next);
      }
      scrollToRemoteStarterConsultation();
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
