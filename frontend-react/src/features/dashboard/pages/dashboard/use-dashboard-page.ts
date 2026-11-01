import { useState } from "react";
import type { DashboardSummary, Task } from "../../../../../../shared/models";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { useTasks } from "../../../tasks/hooks/use-tasks";
export function useDashboardPage() {
  const app = useApp(),
    actions = useTasks(),
    data = useApi<DashboardSummary>("dashboard/summary"),
    tasks = useApi<Task[]>("tasks/priorities"),
    [pick, setPick] = useState(false),
    [chosen, setChosen] = useState<string[]>([]);
  const d = data.data;
  return { app, actions, data, tasks, pick, setPick, chosen, setChosen, d };
}
