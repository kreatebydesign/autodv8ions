import Image from "next/image";
import Link from "next/link";
import { REMOTE_STARTER_CONSULTATION_HREF } from "@/lib/constants/remote-starter-page";

const primaryCtaClass =
  "inline-flex shrink-0 items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]";

export default function RemoteStarterComingSoonSection() {
  return (
    <section
      id="lineup"
      className="border-b border-white/[0.04] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <p className="label-mono mb-4 text-white/40">
              Compustar remote start · Altoona, PA
            </p>
            <h2 className="max-w-2xl text-[clamp(1.65rem,3.2vw,2.35rem)] font-light tracking-tight text-balance">
              New Remote Starter Models Coming Soon
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-[1.75] text-white/48 sm:text-[0.95rem]">
              We&apos;re updating our remote starter lineup. Have questions or
              want to get something scheduled? Send us a message below and
              we&apos;ll help you figure out the best option for your vehicle.
            </p>
            <div className="mt-8">
              <Link href={REMOTE_STARTER_CONSULTATION_HREF} className={primaryCtaClass}>
                Ask About Remote Starters
                <span aria-hidden>→</span>
              </Link>
            </div>
            <p className="mt-8 max-w-xl text-xs leading-relaxed text-white/32">
              AutoDV8ions installs Compustar remote start systems at our Altoona
              shop. Compustar and DroneMobile are trademarks of their respective
              owners; we are an independent authorized installer.
            </p>
          </div>

          <div className="lg:col-span-5">
            <div className="panel relative overflow-hidden p-6 sm:p-8">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(201,0,0,0.12),transparent_55%)]"
                aria-hidden
              />
              <div className="relative z-[1]">
                <p className="label-mono mb-3 text-white/38">What stays the same</p>
                <ul className="space-y-3 text-sm leading-relaxed text-white/45">
                  <li>Professional install and programming for your vehicle</li>
                  <li>Fitment checked before we quote parts and labor</li>
                  <li>Local shop support in Altoona, not a mail-order kit</li>
                </ul>
                <div className="relative mt-8 aspect-[5/4] overflow-hidden rounded-sm border border-white/[0.06]">
                  <Image
                    src="/images/editorial/key-fob.jpg"
                    alt=""
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width:1024px) 100vw, 380px"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[#050505]/80 via-transparent to-transparent"
                    aria-hidden
                  />
                  <p className="absolute bottom-4 left-4 right-4 text-xs leading-relaxed text-white/55">
                    Lineup refresh in progress. Reach out now to plan your install.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
