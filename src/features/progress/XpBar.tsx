import { Progress } from "../../components/ui";

export function XpBar({ value, max }: { value: number; max: number }) {
  return (
    <div style={{ marginTop: 8 }}>
      <Progress
        value={value}
        max={max}
        tone="accent"
        label="Experience towards the next level"
      />
    </div>
  );
}
