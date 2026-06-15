import type { CardType } from '../types';

type Props = {
  type: CardType | string;
  size?: number;
  className?: string;
  title?: string;
};

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const paths: Record<string, JSX.Element> = {
  monster: (
    <g>
      <path d="M5 11c0-3.9 3.1-7 7-7s7 3.1 7 7v4a4 4 0 0 1-4 4h-1l-2 2-2-2H9a4 4 0 0 1-4-4z" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9.5 16h5" />
      <path d="M10 16v2M14 16v2" />
    </g>
  ),
  curse: (
    <g>
      <path d="M12 3c-4 0-7 3-7 7 0 2.5 1.4 4.4 3 5.6V18a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.4c1.6-1.2 3-3.1 3-5.6 0-4-3-7-7-7z" />
      <circle cx="9.5" cy="10.5" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="10.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M10 14.5h4" />
    </g>
  ),
  race: (
    <g>
      <path d="M12 3a5 5 0 0 0-5 5v3l-1.5 3.5A1 1 0 0 0 6.4 16H8v3a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-3h1.6a1 1 0 0 0 .9-1.5L17 11V8a5 5 0 0 0-5-5z" />
      <path d="M17 9l3-2" />
    </g>
  ),
  class: (
    <g>
      <path d="M4 4l9 9" />
      <path d="M13 13l2 2 5 5" />
      <path d="M11 15l-2 2-5 5" />
      <path d="M20 4l-9 9" />
      <path d="M3 19l2 2" />
      <path d="M19 19l2 2" />
    </g>
  ),
  item: (
    <g>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <path d="M9 11l2 2 4-4" />
    </g>
  ),
  oneShot: (
    <g>
      <path d="M9 3h6" />
      <path d="M10 3v5l-4 8a3 3 0 0 0 2.7 4.3h6.6A3 3 0 0 0 18 16l-4-8V3" />
      <path d="M7.5 14h9" />
    </g>
  ),
  levelUp: (
    <g>
      <path d="M12 4l7 8h-4v8h-6v-8H5z" />
    </g>
  ),
  helper: (
    <g>
      <path d="M3 13l4-4 3 3-4 4-3-3z" />
      <path d="M14 17l4-4 3 3-4 4-3-3z" />
      <path d="M8 12l3 3" />
      <path d="M10 14l4-4" />
      <path d="M13 11l3 3" />
    </g>
  ),
  fallback: (
    <g>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8l3-3 3 3M9 16l3 3 3-3" />
    </g>
  ),
};

export function CardTypeIcon({ type, size = 14, className, title }: Props) {
  const content = paths[type] ?? paths.fallback;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      data-testid={`card-type-icon-${type}`}
      {...baseProps}
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  );
}
