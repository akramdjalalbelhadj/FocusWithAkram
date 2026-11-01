import { formatClock } from "../../../../../../shared/time";

export function Ring({
  seconds,
  progress = 0,
  small = false,
  label = "Concentration",
}: {
  seconds: number;
  progress?: number;
  small?: boolean;
  label?: string;
}) {
  return (
    <div className={`timer-ring ${small ? "small" : ""}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="54" className="track" />
        <circle
          cx="60"
          cy="60"
          r="54"
          className="value"
          strokeDasharray={339.3}
          strokeDashoffset={339.3 * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </svg>
      <div>
        <strong role="timer">{formatClock(seconds)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
