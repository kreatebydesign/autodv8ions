"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type RemoteStarterHeroVideoProps = {
  videoSrc: string;
  posterSrc: string;
  posterAlt: string;
  overlayClassName: string;
  /** Matches prior still hero treatment on this page. */
  foregroundOpacityClassName?: string;
};

function syncVideoElement(video: HTMLVideoElement) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.autoplay = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute("disablepictureinpicture", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("muted", "");
}

export default function RemoteStarterHeroVideo({
  videoSrc,
  posterSrc,
  posterAlt,
  overlayClassName,
  foregroundOpacityClassName = "opacity-[0.58] sm:opacity-[0.62]",
}: RemoteStarterHeroVideoProps) {
  const backdropRef = useRef<HTMLVideoElement>(null);
  const foregroundRef = useRef<HTMLVideoElement>(null);
  const [motionOk, setMotionOk] = useState(true);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function apply() {
      setMotionOk(!media.matches);
    }
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!motionOk) return;
    const videos = [backdropRef.current, foregroundRef.current].filter(
      Boolean,
    ) as HTMLVideoElement[];
    for (const video of videos) {
      syncVideoElement(video);
      void video.play().catch(() => {
        /* Autoplay blocked — poster remains visible */
      });
    }
  }, [motionOk, videoSrc]);

  if (!motionOk) {
    return (
      <>
        <Image
          src={posterSrc}
          alt={posterAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className={overlayClassName} />
      </>
    );
  }

  return (
    <>
      <video
        ref={backdropRef}
        aria-hidden
        tabIndex={-1}
        className="remote-starter-hero-video-backdrop pointer-events-none absolute inset-0 h-full w-full scale-[1.08] object-cover opacity-50 blur-2xl brightness-[0.45]"
        preload="metadata"
        poster={posterSrc}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <video
        ref={foregroundRef}
        aria-hidden
        tabIndex={-1}
        className={`remote-starter-hero-video pointer-events-none absolute inset-0 h-full w-full ${foregroundOpacityClassName}`}
        preload="metadata"
        poster={posterSrc}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
      <div className={overlayClassName} />
    </>
  );
}
