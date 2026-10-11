export function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className="row"
      style={{
        gap: 8,
        alignItems: "flex-start",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: 3 }}
      />
      <span>
        <span style={{ display: "block" }}>{label}</span>
        {hint ? <span className="faint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="list__item" style={{ justifyContent: "space-between" }}>
      <span className="faint">{label}</span>
      <span style={{ wordBreak: "break-all" }}>{value}</span>
    </li>
  );
}
