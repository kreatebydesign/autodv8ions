const ITEMS = [
  "27 years in Altoona",
  "Same shop since 1998",
  "Tint-first focus",
  "Clean installs",
  "Select custom work",
];

export default function TrustStrip() {
  return (
    <section
      aria-label="Shop highlights"
      className="border-y border-white/[0.04] bg-white/[0.015]"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 sm:px-8 lg:justify-between lg:px-12">
        {ITEMS.map((item) => (
          <p key={item} className="label-mono text-white/35">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
