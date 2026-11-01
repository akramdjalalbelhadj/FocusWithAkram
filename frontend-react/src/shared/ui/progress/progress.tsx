export function Progress({
  value,
  label = "Progression",
}: {
  value: number;
  label?: string;
}) {
  return (
    <progress
      aria-label={label}
      max={100}
      value={Math.min(100, Math.max(0, value))}
    />
  );
}
