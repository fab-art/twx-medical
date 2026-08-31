/**
 * RSSB (Rwanda Social Security Board) logo — official emblem image.
 *
 * Renders the real RSSB mark (public/icons/rssb-logo.png) instead of a
 * hand-drawn SVG approximation. Keeps the same prop API as before so every
 * call site (Sidebar, LandingView, HelpButton, report headers, etc.)
 * continues to work unchanged.
 */

const LOGO_SRC = '/icons/rssb-logo.png';

type RssbLogoProps = {
  /** Diameter of the circular emblem in pixels. Default 40. */
  size?: number;
  /** Show the "Our Health / Our Future" tagline to the right of the emblem. */
  withTagline?: boolean;
  /** Tagline text size in pixels. Default 11. */
  taglineSize?: number;
  /** Extra className on the wrapping element. */
  className?: string;
  /** Kept for backwards compatibility with existing call sites — the real
   * logo image is used at all sizes, so this no longer changes rendering. */
  compact?: boolean;
};

export function RssbLogo({
  size = 40,
  withTagline = false,
  taglineSize = 11,
  className = '',
}: RssbLogoProps) {
  const emblem = (
    <img
      src={LOGO_SRC}
      alt="RSSB — Rwanda Social Security Board"
      width={size}
      height={size}
      className="shrink-0 rounded-full object-contain"
      style={{ width: size, height: size }}
    />
  );

  if (!withTagline) {
    return <span className={`inline-flex ${className}`}>{emblem}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {emblem}
      <span className="flex flex-col leading-tight" style={{ fontSize: taglineSize }}>
        <span className="font-bold tracking-tight text-foreground" style={{ fontSize: taglineSize + 1 }}>
          Our Health
        </span>
        <span className="font-medium text-muted-foreground" style={{ fontSize: taglineSize - 1 }}>
          Our Future
        </span>
      </span>
    </span>
  );
}

/**
 * Compact square "mark" version — same RSSB logo image, used as the
 * sidebar / header avatar where a tile-shaped mark is expected.
 */
export function RssbMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 rounded-[22%] overflow-hidden bg-[#0F1123] ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={LOGO_SRC}
        alt="RSSB mark"
        width={size}
        height={size}
        className="w-full h-full object-contain p-[8%]"
      />
    </span>
  );
}
