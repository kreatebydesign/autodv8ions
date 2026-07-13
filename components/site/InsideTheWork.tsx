"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/videos/tint/chris-tint.mp4";
const POSTER_SRC = "/videos/tint/chris-tint-poster.jpg";

/**
 * Optional controlled-width tint video — not a hero.
 * Falls back to poster when reduced motion or autoplay fails.
 */
export default function InsideTheWork() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [useVideo, setUseVideo] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setUseVideo(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    void video.play().catch(() => setUseVideo(false));
    return () => {
      video.pause();
    };
  }, []);

  return (
    <section className="inside-work border-t border-white/[0.04] py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <p className="label-mono mb-6 text-white/40">Inside the work</p>
        <div className="inside-work-frame">
          <div className="inside-work-media">
            <Image
              src={POSTER_SRC}
              alt="Window tint installation at AutoDV8ions"
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 900px"
            />
            {useVideo ? (
              <video
                ref={videoRef}
                className="absolute inset-0 z-[1] h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="none"
                poster={POSTER_SRC}
                aria-hidden="true"
              >
                <source src={VIDEO_SRC} type="video/mp4" />
              </video>
            ) : null}
            <div className="inside-work-veil" />
          </div>
        </div>
      </div>
    </section>
  );
}
