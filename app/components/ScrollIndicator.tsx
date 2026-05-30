"use client";

import { useEffect, useState } from "react";

export default function ScrollIndicator() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY < window.innerHeight * 0.6);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-8 right-8 z-50 hidden lg:flex flex-col items-center gap-3 pointer-events-none"
      aria-hidden="true"
    >
      <span className="label-mono [writing-mode:vertical-rl] rotate-180 text-white/30">
        Scroll
      </span>
      <div className="w-px h-12 bg-white/10 relative overflow-hidden">
        <div className="scroll-line absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
      </div>
    </div>
  );
}
