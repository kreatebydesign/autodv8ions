"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/videos/tint/chris-tint.mp4";
const POSTER_SRC = "/videos/tint/chris-tint-poster.jpg";

export default function HomeHeroVideo() {
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

    const play = () => {
      void video.play().catch(() => setUseVideo(false));
    };

    play();
    return () => {
      video.pause();
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <Image
        src={POSTER_SRC}
        alt="AutoDV8ions window tint craftsmanship"
        fill
        priority
        className="hero-poster object-cover object-center"
        sizes="100vw"
      />

      {useVideo ? (
        <video
          ref={videoRef}
          className="hero-video absolute inset-0 z-[1] h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER_SRC}
          aria-hidden="true"
        >
          <source src={VIDEO_SRC} type="video/mp4" />
        </video>
      ) : null}

      <div className="hero-video-veil z-[2]" />
    </div>
  );
}
