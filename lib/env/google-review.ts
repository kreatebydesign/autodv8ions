export function getGoogleReviewUrl(): string | null {
  const url = process.env.GOOGLE_REVIEW_URL?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}
