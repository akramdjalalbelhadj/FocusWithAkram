import { useContext } from "react";
import { TaskContext } from "../context/task-context";

export function useTasks() {
  const value = useContext(TaskContext);
  if (!value) throw new Error("useTasks requires its provider.");
  return value;
}
