type PortfolioFramedImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  draggable?: boolean;
};

/**
 * Full-vehicle presentation: sharp foreground (contain) over a soft blurred backdrop.
 */
export default function PortfolioFramedImage({
  src,
  alt,
  className = "",
  loading = "lazy",
  draggable,
}: PortfolioFramedImageProps) {
  return (
    <div className={`portfolio-framed ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="portfolio-framed-backdrop"
        loading={loading}
        draggable={false}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="portfolio-framed-foreground"
        loading={loading}
        draggable={draggable}
      />
    </div>
  );
}
