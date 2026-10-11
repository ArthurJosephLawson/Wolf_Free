import { useWolfFrame } from "./useWolfFrames";
import { useWolfStore } from "./wolfStore";
import { WolfSprite } from "./WolfSprite";

interface WolfWidgetProps {
  scale?: number;
  onClick?: () => void;
}

export function WolfWidget({ scale = 3, onClick }: WolfWidgetProps) {
  const state = useWolfStore((s) => s.state);
  const { frame } = useWolfFrame(state);

  return (
    <div className="wolf">
      <div
        className="wolf__sprite-wrap"
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? "Pet Wolf" : undefined}
        onKeyDown={
          onClick
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
      >
        <WolfSprite frame={frame} scale={scale} />
      </div>
    </div>
  );
}
