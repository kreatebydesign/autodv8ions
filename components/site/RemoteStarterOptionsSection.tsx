const RANGE_OPTIONS = [
  {
    title: "1-Way Remote Start",
    range: "1/4 Mile Range",
  },
  {
    title: "2-Way Remote Start",
    range: "1/2 Mile Range",
  },
] as const;

const BRANDS = ["Viper", "NuStart", "Compustar"] as const;

export default function RemoteStarterOptionsSection() {
  return (
    <section
      id="lineup"
      className="border-b border-white/[0.04] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="label-mono mb-4 text-white/40">
              Remote start · Altoona, PA
            </p>
            <h2 className="max-w-xl text-[clamp(1.65rem,3.2vw,2.35rem)] font-light tracking-tight text-balance">
              Remote Start Options for Your Vehicle
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-[1.75] text-white/48 sm:text-[0.95rem]">
              Remote start options from Viper, NuStart, and Compustar. Not sure
              which setup is right for your vehicle? Send us a message and
              we&apos;ll help you figure it out.
            </p>

            <div className="mt-10">
              <p className="label-mono mb-4 text-white/38">Available brands</p>
              <ul className="flex flex-wrap items-center gap-x-6 gap-y-3">
                {BRANDS.map((brand) => (
                  <li
                    key={brand}
                    className="text-[clamp(1.05rem,2vw,1.25rem)] font-light tracking-[0.06em] text-white/82"
                  >
                    {brand}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-10 max-w-xl text-xs leading-relaxed text-white/32">
              Viper, NuStart, and Compustar are trademarks of their respective
              owners. AutoDV8ions is an independent installer in Altoona, PA.
            </p>
          </div>

          <div className="lg:col-span-6">
            <p className="label-mono mb-4 text-white/38">Option categories</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {RANGE_OPTIONS.map((option) => (
                <article
                  key={option.title}
                  className="panel flex min-h-[8.5rem] flex-col justify-between p-6 sm:p-7"
                >
                  <h3 className="text-base font-light tracking-tight text-white/90">
                    {option.title}
                  </h3>
                  <p className="mt-4 text-sm font-light text-white/55">
                    {option.range}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-5 max-w-md text-xs leading-relaxed text-white/32">
              These labels describe the original 1-way and 2-way option types we
              walk through at the shop. Range and features depend on the brand,
              remote, and your vehicle.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
