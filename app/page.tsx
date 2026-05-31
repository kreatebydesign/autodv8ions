import Image from "next/image";
import Link from "next/link";
import ScrollIndicator from "./components/ScrollIndicator";

const LOGO = "/images/logos/dv8-logo.png";

const HERO_IMAGE =
  "https://static.wixstatic.com/media/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg/v1/fill/w_1600,h_894,q_90,enc_avif,quality_auto/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg";

const SOCIALS = {
  instagram: "https://www.instagram.com/autodv8ions",
  facebook: "https://www.facebook.com/autodv8ions",
};

export default function HomePage() {
  return (
    <main className="bg-black text-white overflow-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-5 lg:px-10">
          <Link href="/" className="relative h-10 w-[90px]">
            <Image
              src={LOGO}
              alt="AutoDV8ions"
              fill
              className="object-contain"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-10 text-[11px] uppercase tracking-[0.28em] text-white/55 md:flex">
            <a href="#about" className="transition hover:text-white">
              About
            </a>
            <a href="#services" className="transition hover:text-white">
              Services
            </a>
            <a href="#gallery" className="transition hover:text-white">
              Gallery
            </a>
            <a href="#contact" className="transition hover:text-white">
              Contact
            </a>
            <Link href="/tint-quote" className="transition hover:text-white">
              Tint Quote
            </Link>
          </nav>

          <Link
            href="/tint-quote"
            className="border border-white/10 bg-white/[0.03] px-6 py-3 text-[10px] uppercase tracking-[0.3em] text-white transition duration-300 hover:border-[#7f1d1d] hover:bg-[#7f1d1d]/20"
          >
            Get Quote
          </Link>
        </div>
      </header>

      <section className="relative flex min-h-screen items-end overflow-hidden pt-28">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Tesla Model Y"
            fill
            priority
            className="object-cover"
          />

          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col px-6 pb-20 lg:px-10 lg:pb-28">
          <div className="max-w-3xl">
            <p className="mb-6 text-[11px] uppercase tracking-[0.35em] text-white/40">
              Altoona, PA · Est. 1998
            </p>

            <h1 className="max-w-4xl text-5xl font-light leading-[0.95] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl lg:text-[92px]">
              Elevate the ride.
              <br />
              <span className="text-white/55">Not just modify it.</span>
}