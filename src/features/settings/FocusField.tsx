import { useState } from "react";

export function FocusField({
  label,
  value,
  presets,
  onChange,
}: {
  label: string;
  value: number;
  presets: readonly number[];
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [renderedValue, setRenderedValue] = useState(value);
  const fieldId = `focus-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  if (renderedValue !== value) {
    setRenderedValue(value);
    setDraft(String(value));
  }

  return (
    <div className="row">
      <span className="field__label" style={{ minWidth: 190 }}>
        {label}
      </span>
      <div className="row" style={{ gap: 2 }}>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`btn btn--small${preset === value ? " btn--primary" : " btn--ghost"}`}
            onClick={() => onChange(preset)}
            aria-pressed={preset === value}
          >
            {preset}
          </button>
        ))}
      </div>
      <label className="visually-hidden" htmlFor={fieldId}>
        {label} in minutes
      </label>
      <input
        id={fieldId}
        className="input"
        style={{ width: 76 }}
        type="number"
        min={1}
        max={180}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const parsed = Number(draft);
          if (
            Number.isFinite(parsed) &&
            parsed >= 1 &&
            parsed <= 180 &&
            parsed !== value
          )
            onChange(Math.floor(parsed));
          else setDraft(String(value));
        }}
      />
      <span className="faint">min</span>
    </div>
  );
}
