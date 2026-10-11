import { WOLF_MARK_PATHS, WOLF_VIEWBOX } from "../assets/brand/wolf-mark";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${WOLF_VIEWBOX} ${WOLF_VIEWBOX}`}
      width={size}
      height={size}
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden={true}
      focusable="false"
    >
      {WOLF_MARK_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
