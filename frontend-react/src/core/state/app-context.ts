import { createContext } from "react";
import type { useAppState } from "./use-app-state";

export const Ctx = createContext<ReturnType<typeof useAppState> | null>(null);
