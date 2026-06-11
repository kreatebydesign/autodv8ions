import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { title: "Recent Work | AutoDV8ions" };
  }

  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!data) {
    return { title: "Recent Work | AutoDV8ions" };
  }

  return {
    title: data.seo_title || `${data.vehicle} ${data.service_type} | AutoDV8ions`,
    description:
      data.seo_description ||
      `Recent ${data.service_type.toLowerCase()} work on a ${data.vehicle} by AutoDV8ions in Altoona, PA.`,
  };
}

export default async function RecentWorkPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = getSupabaseAdmin();
  if (!supabase) notFound();

  const { data } = await supabase
    .from("gallery_items")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();

  if (!data) notFound();

  const photos = (data.photos as string[]) || [];
  const videos = (data.videos as string[]) || [];

  return (
    <main className="min-h-screen bg-[#050505] text-[#f8f8f8]">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
        <Link href="/" className="text-xs uppercase tracking-[0.18em] text-[#a1a1aa]">
          ← AutoDV8ions
        </Link>
        <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[#a1a1aa]">
          Recent Work
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight">
          {data.vehicle}
        </h1>
        <p className="mt-3 text-[#a1a1aa]">
          {data.service_type} · Altoona, PA · {formatDate(data.work_date)}
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {photos.map((photo, index) => (
            <a
              key={`${photo}-${index}`}
              href={photo}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-white/10 bg-[#101010] p-3 text-sm text-[#a1a1aa] transition-colors hover:border-[#d30b0b]/40"
            >
              View Photo {index + 1}
            </a>
          ))}
          {videos.map((video, index) => (
            <a
              key={`${video}-${index}`}
              href={video}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-white/10 bg-[#101010] p-3 text-sm text-[#a1a1aa] transition-colors hover:border-[#d30b0b]/40"
            >
              View Video {index + 1}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
