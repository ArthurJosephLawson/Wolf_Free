import type { ReactNode } from "react";

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      className="row"
      role="radiogroup"
      aria-label={label}
      style={{ gap: 2 }}
      onKeyDown={(event) => {
        const index = options.findIndex((option) => option.value === value);
        let next: number;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          next = (index + 1) % options.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          next = (index - 1 + options.length) % options.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = options.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        onChange(options[next]!.value);
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={`btn btn--small${selected ? " btn--primary" : " btn--ghost"}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon ? <span aria-hidden="true">{option.icon}</span> : null}
            {option.label}
            {typeof option.count === "number" ? (
              <span className="faint">{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
