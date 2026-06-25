type SlotKind = 'head' | 'body' | 'hand' | 'feet' | 'twoHands';

type Props = {
  slot: SlotKind;
  size?: number;
  className?: string;
};

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.3,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const paths: Record<SlotKind, JSX.Element> = {
  head: (
    <g>
      {/* helmet silhouette */}
      <path d="M6 11c0-3.5 2.7-6 6-6s6 2.5 6 6v2H6z" />
      <path d="M5 13h14" />
      <path d="M9 8.5h6" />
      <circle cx="12" cy="6" r="0.6" fill="currentColor" stroke="none" />
    </g>
  ),
  body: (
    <g>
      {/* breastplate */}
      <path d="M8 6l-2 3v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9l-2-3z" />
      <path d="M9 8.5h6" />
      <path d="M12 8.5v9" />
      <path d="M10 12h4" />
    </g>
  ),
  hand: (
    <g>
      {/* gauntlet / mitten */}
      <path d="M8 5h6l1 4v6a3 3 0 0 1-3 3h-3a3 3 0 0 1-3-3V9z" />
      <path d="M9 11h6" />
      <path d="M9 14h6" />
    </g>
  ),
  feet: (
    <g>
      {/* boot */}
      <path d="M8 5h3l1 8h3a2 2 0 0 1 2 2v3a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-8z" />
      <path d="M8 10h3" />
    </g>
  ),
  twoHands: (
    <g>
      {/* sword (two-handed) */}
      <path d="M12 3v12" />
      <path d="M8 15h8" />
      <path d="M10 17h4" />
      <path d="M11 19h2v2h-2z" />
      <path d="M11 5l1-2 1 2" />
    </g>
  ),
};

export function SlotIcon({ slot, size = 18, className }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      data-testid={`slot-icon-${slot}`}
      {...baseProps}
    >
      {paths[slot]}
    </svg>
  );
}
