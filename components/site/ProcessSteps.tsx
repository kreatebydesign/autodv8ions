"use client";

import { useEffect, useRef } from "react";

const STEPS = [
  {
    num: "01",
    title: "Tell us about the vehicle",
    copy: "Year, make, model, and what you want from the work.",
  },
  {
    num: "02",
    title: "Get a clear recommendation",
    copy: "Practical options with no pressure and no filler.",
  },
  {
    num: "03",
    title: "Schedule the work",
    copy: "A clean appointment window that fits the shop and your day.",
  },
  {
    num: "04",
    title: "Precision installation",
    copy: "Careful prep, clean fitment, and attention to the finish.",
  },
  {
    num: "05",
    title: "Final quality review",
    copy: "We check the result before the vehicle leaves the bay.",
  },
  {
    num: "06",
    title: "Pickup and enjoy",
    copy: "Leave with a cleaner look, better comfort, or added peace of mind.",
  },
];

export default function ProcessSteps({
  eyebrow = "The experience",
  title = "How the work gets done",
  intro = "A straightforward path from first conversation to finished install.",
}: {
  eyebrow?: string;
  title?: string;
  intro?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="atmosphere relative border-t border-white/[0.04] py-20 sm:py-28 reveal-section"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="mb-12 max-w-2xl sm:mb-16">
          <p className="label-mono mb-4 text-white/40">{eyebrow}</p>
          <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-light tracking-[-0.02em]">
            {title}
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/40">
            {intro}
          </p>
        </div>

        <ol className="process-grid">
          {STEPS.map((step, index) => (
            <li
              key={step.num}
              className="process-step"
              style={{ ["--step-delay" as string]: `${index * 60}ms` }}
            >
              <span className="label-mono text-[var(--accent)]/70">
                {step.num}
              </span>
              <h3 className="mt-3 text-lg font-light tracking-tight text-white/90">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/40">
                {step.copy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
