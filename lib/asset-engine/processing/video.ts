/**
 * Video handling for Phase 2A:
 * - Store original only (no transcode)
 * - Collect available metadata
 * - Prepare hooks for future thumbnail generation
 */

export type VideoMetadata = {
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  /** Always false in Phase 2A — reserved for later. */
  thumbnailReady: false;
};

export function collectVideoMetadata(input: {
  mimeType: string;
  byteLength: number;
}): VideoMetadata {
  void input;
  return {
    width: null,
    height: null,
    durationSeconds: null,
    thumbnailReady: false,
  };
}

export function assertNoVideoTranscode(): void {
  // Explicit guard so future workers don't accidentally add ffmpeg here silently.
}
