import { createContext } from "react";
import type { useActions } from "../hooks/use-task-actions";

export const TaskContext = createContext<ReturnType<typeof useActions> | null>(
  null,
);
