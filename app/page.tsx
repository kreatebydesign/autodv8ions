const services = [
  "Window Tint",
  "Remote Starters",
  "Vehicle Security",
  "Custom Styling",
  "Lighting Upgrades",
  "Detail-Focused Installs",
];

const builds = [
  "autodv8ions-model-y.jpg",
  "autodv8ions-bay.jpg",
  "autodv8ions-charger.jpg",
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020202] text-white">
      <section className="relative min-h-screen border-b border-white/10">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('/images/auto-dv8ions/hero-custom-car.jpg')] bg-cover bg-center opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(170,0,0,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_25%)]" />
        </div>

        <div className="relative z-10 px-6 md:px-12 lg:px-20">
          <nav className="flex items-center justify-between border-b border-white/10 py-7">
            <div>
              <p className="text-[10px] uppercase tracking-[0.55em] text-red-500">
                // AUTODV8IONS
              </p>
              <p className="mt-2 text-sm uppercase tracking-[0.32em] text-white/45">
                Tint · Starters · Security · Styling
              </p>
            </div>

            <div className="hidden items-center gap-8 text-[11px] uppercase tracking-[0.28em] text-white/55 md:flex">
              <a href="#services" className="transition hover:text-white">
                Services
              </a>
              <a href="#featured" className="transition hover:text-white">
                Featured
              </a>
              <a href="/tint-quote" className="transition hover:text-white">
                Tint Quote
              </a>
              <a href="#contact" className="transition hover:text-white">
                Contact
              </a>
            </div>

            <a
              href="tel:8142012456"
              className="border border-white/15 bg-white/[0.03] px-5 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-white/80 backdrop-blur transition hover:border-red-500 hover:bg-white/[0.08]"
            >
              Call Now
            </a>
          </nav>

          <div className="grid min-h-[calc(100vh-100px)] items-center gap-16 py-20 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="mb-6 text-[11px] uppercase tracking-[0.5em] text-red-500">
                Altoona, Pennsylvania
              </p>

              <h1 className="max-w-5xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] md:text-8xl lg:text-[8.8rem]">
                Built clean.
                <br />
                Built dark.
                <br />
                Built different.
              </h1>

              <p className="mt-8 max-w-2xl text-lg leading-8 text-white/62">
                Premium window tint, remote starters, vehicle security,
                lighting upgrades, and custom styling for drivers who want
                more comfort, more presence, and a sharper identity.
              </p>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/tint-quote"
                  className="bg-red-600 px-8 py-5 text-center text-[11px] font-black uppercase tracking-[0.28em] transition hover:bg-red-500"
                >
                  Get Tint Quote
                </a>

                <a
                  href="#services"
                  className="border border-white/15 bg-white/[0.03] px-8 py-5 text-center text-[11px] font-black uppercase tracking-[0.28em] text-white/75 backdrop-blur transition hover:border-white hover:bg-white/[0.06] hover:text-white"
                >
                  Explore Services
                </a>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="border border-white/10 bg-black/40 p-5 backdrop-blur">
                <div className="aspect-[4/5] overflow-hidden">
                  <div className="h-full w-full bg-[linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.88)),url('/images/auto-dv8ions/hero-custom-car.jpg')] bg-cover bg-center transition duration-[2500ms] hover:scale-105" />
                </div>
              </div>

              <div className="absolute -bottom-8 -left-8 border border-white/10 bg-black/70 p-7 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.45em] text-red-500">
                  Trusted Since
                </p>

                <p className="mt-3 text-4xl font-black uppercase">27+ Years</p>

                <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
                  Real builds. Real installs. Central Pennsylvania’s trusted
                  automotive upgrade shop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#070707] px-6 py-10 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[
            ["27+", "Years in Central PA"],
            ["Clean", "No messy installs"],
            ["Daily", "Real builds uploaded"],
          ].map(([big, small]) => (
            <div
              key={big}
              className="border border-white/10 bg-white/[0.03] p-7 backdrop-blur"
            >
              <p className="text-4xl font-black uppercase tracking-[-0.05em]">
                {big}
              </p>

              <p className="mt-3 text-[11px] uppercase tracking-[0.32em] text-white/45">
                {small}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="services"
        className="bg-[#020202] px-6 py-28 md:px-12 lg:px-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-[11px] uppercase tracking-[0.5em] text-red-500">
                Services
              </p>

              <h2 className="mt-5 max-w-5xl text-5xl font-black uppercase leading-none tracking-[-0.06em] md:text-7xl">
                Premium upgrades without the gimmicks.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-white/52">
              AutoDV8ions focuses on clean installs, elevated styling,
              comfort upgrades, and detail-focused execution designed to
              make your vehicle feel sharper everywhere it goes.
            </p>
          </div>

          <div className="mt-16 grid gap-[1px] bg-white/10 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service}
                className="group bg-[#050505] p-8 transition duration-300 hover:bg-[#0b0b0b]"
              >
                <div className="mb-10 h-px w-12 bg-red-600 transition-all duration-300 group-hover:w-24" />

                <h3 className="text-3xl font-black uppercase tracking-[-0.05em]">
                  {service}
                </h3>

                <p className="mt-5 text-sm leading-7 text-white/50">
                  Precision-focused installs designed for comfort,
                  protection, style, and long-term daily use.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="featured"
        className="border-y border-white/10 bg-[#080808] px-6 py-28 md:px-12 lg:px-20"
      >
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.5em] text-red-500">
              Featured Work
            </p>

            <h2 className="mt-5 text-5xl font-black uppercase leading-none tracking-[-0.06em] md:text-7xl">
              Presence.
              <br />
              Precision.
              <br />
              Identity.
            </h2>
          </div>

          <p className="hidden max-w-sm text-sm leading-7 text-white/50 lg:block">
            Designed for drivers who want their vehicle to feel elevated
            before the engine even starts.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {builds.map((img, index) => (
            <div
              key={img}
              className={`group relative min-h-[520px] overflow-hidden border border-white/10 ${
                index === 1 ? "lg:translate-y-10" : ""
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition duration-[2500ms] group-hover:scale-105"
                style={{
                  backgroundImage: `linear-gradient(180deg,rgba(0,0,0,0.05),rgba(0,0,0,0.9)),url('/images/auto-dv8ions/${img}')`,
                }}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

              <div className="absolute bottom-0 left-0 p-8">
                <p className="text-[10px] uppercase tracking-[0.4em] text-red-500">
                  AutoDV8ions
                </p>

                <p className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">
                  Featured Build
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#020202] px-6 py-28 md:px-12 lg:px-20">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.5em] text-red-500">
              Why AutoDV8ions
            </p>

            <h2 className="mt-5 text-5xl font-black uppercase leading-none tracking-[-0.06em] md:text-7xl">
              More comfort.
              <br />
              More protection.
              <br />
              More attitude.
            </h2>
          </div>

          <div className="grid gap-[1px] bg-white/10 md:grid-cols-2">
            {[
              "Tint that changes the entire profile.",
              "Remote starters built for Pennsylvania winters.",
              "Security upgrades with clean OEM-style integration.",
              "Custom styling designed to stand apart naturally.",
            ].map((item) => (
              <div key={item} className="bg-[#050505] p-8">
                <p className="text-2xl font-black uppercase leading-tight tracking-[-0.04em]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="border-t border-white/10 bg-[#050505] px-6 py-28 md:px-12 lg:px-20"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_420px]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.5em] text-red-500">
              Start Your Build
            </p>

            <h2 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.84] tracking-[-0.08em] md:text-8xl">
              Make it impossible to ignore.
            </h2>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
            <p className="text-2xl font-black uppercase">AutoDV8ions</p>

            <div className="mt-8 space-y-5 text-sm leading-7 text-white/60">
              <p>
                1648 E. Pleasant Valley Blvd
                <br />
                Altoona, PA 16602
              </p>

              <a
                href="tel:8142012456"
                className="block transition hover:text-red-400"
              >
                814.201.2456
              </a>

              <a
                href="mailto:sales@autodv8ions.com"
                className="block transition hover:text-red-400"
              >
                sales@autodv8ions.com
              </a>
            </div>

            <a
              href="/tint-quote"
              className="mt-10 block bg-red-600 px-6 py-5 text-center text-[11px] font-black uppercase tracking-[0.3em] transition hover:bg-red-500"
            >
              Get Tint Quote
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-6 py-8 md:px-12 lg:px-20">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 text-[10px] uppercase tracking-[0.35em] text-white/30 md:flex-row">
          <p>© 2026 AutoDV8ions Sound Security & Tint LLC</p>
          <p>Website by KXD</p>
        </div>
      </footer>
    </main>
  );
}