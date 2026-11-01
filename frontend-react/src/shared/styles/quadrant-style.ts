import type { CSSProperties } from "react";
import type { Quadrant } from "../../../../shared/models";

export function qstyle(q: Quadrant): CSSProperties {
  return {
    "--qc": `var(--${q.toLowerCase()})`,
    "--qa": `var(--${q.toLowerCase()}-accent)`,
    "--qs": `var(--${q.toLowerCase()}-soft)`,
    "--ql": `var(--${q.toLowerCase()}-line)`,
  } as CSSProperties;
}
