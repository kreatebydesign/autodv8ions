export function publicMediaUrl(
  mediaId: string,
  variant: "thumbnail" | "small" | "medium" | "large" | "original" = "medium",
) {
  return `/api/portfolio/media/${mediaId}?variant=${variant}`;
}
