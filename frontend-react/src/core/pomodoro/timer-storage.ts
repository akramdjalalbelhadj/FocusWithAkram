import type { SessionState } from "../../../../shared/models";

export function readTimer() {
  try {
    return JSON.parse(localStorage.getItem("ff.react.timer") || "null") as {
      state: SessionState;
      offset: number;
    } | null;
  } catch {
    return null;
  }
}
