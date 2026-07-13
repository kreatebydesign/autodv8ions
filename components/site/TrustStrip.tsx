const TRUST_ITEMS = [
  "Serving Altoona and Central Pennsylvania",
  "27 years of automotive craftsmanship",
  "Precision installation",
  "Respect for every vehicle",
  "Clear recommendations without pressure",
];

export default function TrustStrip() {
  return (
    <section className="border-y border-white/[0.05] bg-black/40">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-5 py-6 sm:px-8 lg:justify-between lg:px-12 lg:py-7">
        {TRUST_ITEMS.map((item) => (
          <p key={item} className="label-mono text-center text-white/40">
            {item}
          </p>
        ))}
      </div>
    </section>
  );
}
