import type { ReactNode } from "react";
import { Ctx } from "../../core/state/app-context";
import { useAppState } from "../../core/state/use-app-state";

export function Provider({ children }: { children: ReactNode }) {
  const value = useAppState();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
