/**
 * Split plain-text email bodies into visible reply text vs quoted history.
 */
export type SplitEmailBodyResult = {
  primary: string;
  quoted: string | null;
};

const QUOTE_MARKERS = [
  /\n-{2,}\s*Original Message\s*-{2,}\n/i,
  /\n-{2,}\s*Forwarded message\s*-{2,}\n/i,
  /\nOn .+wrote:\s*\n/i,
  /\n_{5,}\n/,
];

export function splitPlainTextEmailBody(text: string): SplitEmailBodyResult {
  const normalized = text.replace(/\r\n/g, "\n");
  let splitAt = -1;

  for (const pattern of QUOTE_MARKERS) {
    const match = pattern.exec(normalized);
    if (match && match.index > 0) {
      if (splitAt === -1 || match.index < splitAt) splitAt = match.index;
    }
  }

  if (splitAt === -1) {
    const lines = normalized.split("\n");
    const quoteStart = lines.findIndex(
      (line, idx) => idx > 0 && /^>/.test(line.trim()),
    );
    if (quoteStart > 0) {
      splitAt = lines.slice(0, quoteStart).join("\n").length + 1;
    }
  }

  if (splitAt <= 0) {
    return { primary: normalized.trim(), quoted: null };
  }

  const primary = normalized.slice(0, splitAt).trim();
  const quoted = normalized.slice(splitAt).trim();
  if (!quoted) return { primary: normalized.trim(), quoted: null };
  return { primary, quoted };
}
