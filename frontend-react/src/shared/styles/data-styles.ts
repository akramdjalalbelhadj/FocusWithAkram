import type { CSSProperties } from "react";

/** Only runtime data goes through custom properties; visual rules stay in CSS. */
export function projectColor(color: string): CSSProperties {
  return { "--project-color": color } as CSSProperties;
}

export function activityHeight(
  seconds: number,
  maximum: number,
): CSSProperties {
  return {
    "--activity-height": `${(100 * seconds) / maximum}%`,
  } as CSSProperties;
}

export function heatIntensity(seconds: number): CSSProperties {
  const intensity = seconds ? Math.min(100, 20 + seconds / 144) : 0;
  return { "--heat-intensity": `${intensity}%` } as CSSProperties;
}
