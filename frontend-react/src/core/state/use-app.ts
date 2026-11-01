import { useContext } from "react";
import { Ctx } from "./app-context";

export function useApp() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useApp requires its provider.");
  return value;
}
