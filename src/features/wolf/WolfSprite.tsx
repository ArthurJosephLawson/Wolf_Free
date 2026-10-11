import { useMemo } from "react";
import {
  SPRITE_HEIGHT,
  SPRITE_WIDTH,
  toRuns,
  type Matrix,
} from "../../assets/wolf/sprites";

interface WolfSpriteProps {
  frame: Matrix;

  scale?: number;
  className?: string;

  onClick?: () => void;
}

export function WolfSprite({
  frame,
  scale = 4,
  className,
  onClick,
}: WolfSpriteProps) {
  const runs = useMemo(() => toRuns(frame), [frame]);
  const width = SPRITE_WIDTH * scale;
  const height = SPRITE_HEIGHT * scale;

  return (
    <svg
      className={`pixel-sprite wolf-sprite${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`}
      width={width}
      height={height}
      shapeRendering="crispEdges"
      role="presentation"
      aria-hidden={true}
      onClick={onClick}
    >
      {runs.map((run) => (
        <rect
          key={`${run.y}-${run.x}-${run.fill}`}
          x={run.x}
          y={run.y}
          width={run.width}
          height={run.height}
          fill={run.fill}
        />
      ))}
    </svg>
  );
}

export { SPRITE_WIDTH, SPRITE_HEIGHT };
