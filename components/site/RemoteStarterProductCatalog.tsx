import Image from "next/image";
import Link from "next/link";
import CompustarProductGrid from "@/components/site/CompustarProductGrid";
import { getEnabledCompustarProducts } from "@/lib/constants/compustar-remote-starters";
import { REMOTE_STARTER_INSTALL_PACKAGES } from "@/lib/constants/remote-starter-packages";
import { REMOTE_STARTER_CONSULTATION_HREF } from "@/lib/constants/remote-starter-page";

const quoteCtaClass =
  "inline-flex shrink-0 items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]";

const quoteLinkClass =
  "inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/50 transition-colors duration-500 hover:text-white";

function installPackageInquiryHref(title: string) {
  return `/services/remote-starters?interest=${encodeURIComponent(title)}#remote-starter-contact`;
}

/**
 * Full Compustar product grid and install package cards.
 * Hidden on the live page while `REMOTE_STARTER_PRODUCT_CATALOG_ENABLED` is false.
 */
export default function RemoteStarterProductCatalog() {
  const compustarProducts = getEnabledCompustarProducts();

  return (
    <>
      <section
        id="compustar"
        className="border-b border-white/[0.04] py-14 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Compustar systems</p>
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.25rem)] font-light tracking-tight">
                Pick a starting point
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
                Four Compustar setups we quote most often around Altoona, from
                a full bundle to long-range PRO remotes. Stock and kit choice
                vary; we confirm what works on your vehicle before we price it.
              </p>
            </div>
            <div className="lg:col-span-5 lg:text-right">
              <Link href={REMOTE_STARTER_CONSULTATION_HREF} className={quoteLinkClass}>
                Get a quote
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <div className="mt-10">
            <CompustarProductGrid products={compustarProducts} />
          </div>

          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-white/32">
            Range numbers are manufacturer maximums. Buildings, hills, and
            interference cut into real-world distance. Compustar and DroneMobile
            are trademarks of their owners; AutoDV8ions is an independent
            installer.
          </p>
        </div>
      </section>

      <section
        id="options"
        className="border-t border-white/[0.04] py-14 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <p className="label-mono mb-4 text-white/40">Shop packages</p>
          <h2 className="max-w-2xl text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
            Install paths we quote every week
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/45">
            Besides the Compustar cards above, these are the packages customers
            ask for by name. Hardware and labor still depend on your vehicle;
            the form below is how we price it.
          </p>

          <div className="mt-10 grid items-stretch gap-4 lg:grid-cols-2">
            {REMOTE_STARTER_INSTALL_PACKAGES.map((item) => (
              <article
                key={item.title}
                className="panel flex h-full flex-col overflow-hidden p-5 sm:p-6"
              >
                <div className="relative mb-4 flex h-[13.25rem] items-center justify-center overflow-hidden sm:mb-5 sm:h-[15rem]">
                  <div
                    className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.09)_0%,rgba(255,255,255,0.03)_38%,transparent_72%)]"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-[22%] bottom-[6%] h-8 rounded-[100%] bg-black/35 blur-lg"
                    aria-hidden
                  />
                  <Image
                    src={item.imageSrc}
                    alt={item.imageAlt}
                    width={379}
                    height={616}
                    className="relative z-[1] h-[118%] w-auto max-w-[12rem] object-contain drop-shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:max-w-[13.5rem]"
                    sizes="(max-width:640px) 192px, 216px"
                  />
                </div>

                <h3 className="text-lg font-light leading-snug text-white/90">
                  {item.title}
                </h3>

                <ul className="mt-5 flex-1 space-y-3 text-sm leading-relaxed text-white/45">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex gap-3">
                      <span
                        className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)] opacity-80"
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={installPackageInquiryHref(item.title)}
                  className="mt-6 inline-flex w-full items-center justify-center border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.16em] text-white/75 transition-colors duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.07] hover:text-white sm:w-auto"
                >
                  Get a quote for this
                </Link>
              </article>
            ))}
          </div>

          <article className="panel mt-6 p-5 sm:p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-8">
                <p className="label-mono mb-3 text-white/40">Add-on</p>
                <h3 className="text-lg font-light text-white/90">
                  DroneMobile smartphone control
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/45">
                  Start, lock, and check status from the DroneMobile app when
                  your Compustar hardware supports it. Requires their LTE module
                  and a paid plan. We quote module and install with your remote
                  start job.
                </p>
              </div>
              <div className="lg:col-span-4 lg:text-right">
                <Link
                  href="/services/remote-starters?interest=dronemobile#remote-starter-contact"
                  className={`${quoteCtaClass} w-full justify-center sm:w-auto lg:justify-end`}
                >
                  GET A QUOTE
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
