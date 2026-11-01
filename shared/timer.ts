import type { PomodoroSession } from "./models";
/** Server timestamp is authoritative; ticks only refresh the display. */
export function remainingSeconds(
  session: PomodoroSession | null,
  now: number,
  offset: number,
): number {
  if (!session) return 0;
  if (session.status === "RUNNING" && session.expectedEndAt)
    return Math.max(
      0,
      (Date.parse(session.expectedEndAt) - now - offset) / 1000,
    );
  return session.remainingSeconds;
}
