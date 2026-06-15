type Props = {
  size?: number;
  className?: string;
  title?: string;
  asSvgChild?: boolean;
  x?: number;
  y?: number;
};

const path = (
  <g>
    <path d="M7 5h10v3a5 5 0 0 1-5 5 5 5 0 0 1-5-5z" />
    <path d="M7 6H5a2 2 0 0 0 2 4" />
    <path d="M17 6h2a2 2 0 0 1-2 4" />
    <path d="M10 13v2a2 2 0 0 1-1 1.7L8 18h8l-1-1.3A2 2 0 0 1 14 15v-2" />
    <path d="M8 20h8" />
    <path d="M9 18v2M15 18v2" />
  </g>
);

export function TrophyIcon({ size = 24, className, title, asSvgChild = false, x, y }: Props) {
  const baseProps = {
    fill: 'none' as const,
    stroke: 'currentColor' as const,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  if (asSvgChild) {
    const half = size / 2;
    return (
      <svg
        x={(x ?? 0) - half}
        y={(y ?? 0) - half}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        data-testid="trophy-icon"
        {...baseProps}
      >
        {path}
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      data-testid="trophy-icon"
      {...baseProps}
    >
      {title && <title>{title}</title>}
      {path}
    </svg>
  );
}
