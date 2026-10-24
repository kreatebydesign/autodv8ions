import Image from "next/image";
import Link from "next/link";
import {
  COMPUSTAR_AVAILABILITY_LABEL,
  COMPUSTAR_PRODUCT_TIER_LABEL,
  type CompustarRemoteStarterProduct,
} from "@/lib/constants/compustar-remote-starters";

export function compustarInquiryHref(productId: string) {
  return `/services/remote-starters?system=${encodeURIComponent(productId)}#consultation`;
}

function CompustarProductCard({ product }: { product: CompustarRemoteStarterProduct }) {
  return (
    <article className="group panel flex h-full flex-col overflow-hidden p-5 transition-colors duration-500 sm:p-6">
      <div className="relative mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-sm bg-gradient-to-b from-white/[0.04] to-transparent sm:mb-5">
        <div
          className="pointer-events-none absolute inset-[12%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08)_0%,transparent_70%)]"
          aria-hidden
        />
        <Image
          src={product.image.src}
          alt={product.image.alt}
          width={768}
          height={768}
          className="relative z-[1] h-[78%] w-[78%] object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-[1.02]"
          sizes="(max-width:640px) 45vw, (max-width:1024px) 22vw, 280px"
        />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-mono text-[0.65rem] text-white/35">
          {COMPUSTAR_PRODUCT_TIER_LABEL[product.tier]}
        </p>
        <p className="text-[0.65rem] uppercase tracking-[0.14em] text-white/40">
          {COMPUSTAR_AVAILABILITY_LABEL[product.availabilityStatus]}
        </p>
      </div>

      <h3 className="mt-2 text-lg font-light tracking-tight text-white/92">
        {product.name}
      </h3>
      <p className="mt-1 text-xs text-white/40">{product.maxAdvertisedRange}</p>

      <p className="mt-3 text-sm leading-relaxed text-white/45">
        {product.shortDescription}
      </p>

      <ul className="mt-4 flex-1 space-y-2.5 text-sm leading-relaxed text-white/42">
        {product.features.map((feature) => (
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
        href={compustarInquiryHref(product.id)}
        className="mt-5 inline-flex w-full items-center justify-center border border-white/12 bg-white/[0.04] px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.16em] text-white/75 transition-colors duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.07] hover:text-white"
      >
        Get a quote
      </Link>
    </article>
  );
}

export default function CompustarProductGrid({
  products,
}: {
  products: CompustarRemoteStarterProduct[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <CompustarProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
