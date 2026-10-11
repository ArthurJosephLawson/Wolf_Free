import { useEffect, useState } from "react";
import { frameDurations, nextBlinkDelay } from "../../assets/wolf/animation";
import { framesFor, type Matrix, type WolfState } from "../../assets/wolf/sprites";

interface WolfFrameView {
  frame: Matrix;
  index: number;
  count: number;
}

const DEFAULT_STEP_MS = 120;

export function useWolfFrame(state: WolfState): WolfFrameView {
  const [index, setIndex] = useState(0);
  const [blinkIndex, setBlinkIndex] = useState<number | null>(null);
  const [renderedState, setRenderedState] = useState(state);

  if (renderedState !== state) {
    setRenderedState(state);
    setIndex(0);
    setBlinkIndex(null);
  }

  const frames = framesFor(state);
  const count = frames.length;

  useEffect(() => {
    if (count <= 1) return;
    const durations = frameDurations(state, count);
    let frame = 0;
    let timer = 0;

    const step = () => {
      frame = (frame + 1) % count;
      setIndex(frame);
      timer = window.setTimeout(step, durations[frame] ?? DEFAULT_STEP_MS);
    };

    timer = window.setTimeout(step, durations[0] ?? DEFAULT_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [state, count]);

  useEffect(() => {
    if (state !== "idle") return;

    const blinkFrames = framesFor("blink");
    let phase = 0;
    let timer = 0;

    const playBlink = () => {
      phase = 0;
      const advance = () => {
        if (phase >= blinkFrames.length) {
          setBlinkIndex(null);
          schedule();
          return;
        }
        setBlinkIndex(phase);
        phase += 1;
        timer = window.setTimeout(advance, 100);
      };
      advance();
    };

    const schedule = () => {
      timer = window.setTimeout(playBlink, nextBlinkDelay());
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [state]);

  const blinkFrames = framesFor("blink");
  const blinking = state === "idle" && blinkIndex !== null;
  const shown = blinking ? blinkFrames[blinkIndex!] : frames[index % count];

  return {
    frame: shown ?? frames[0]!,
    index: index % count,
    count,
  };
}
