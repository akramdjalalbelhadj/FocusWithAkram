import { useState } from "react";
import type { PriorityMode, Task } from "../../../../../../shared/models";
import { query } from "../../../../core/api/query";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { useTasks } from "../../hooks/use-tasks";
export function useTasksPage() {
  const app = useApp(),
    a = useTasks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<PriorityMode>("PRIORITIES"),
    [q, setQ] = useState(""),
    [project, setProject] = useState(""),
    [tag, setTag] = useState(""),
    [sort, setSort] = useState("priority");
  const data = useApi<Task[]>(
    "tasks/priorities?" + query({ mode, q, projectId: project, tag }),
  );
  const rows = [...(data.data || [])].sort((a, b) =>
    sort === "title"
      ? a.title.localeCompare(b.title)
      : sort === "due"
        ? (a.plannedEndAt || "z").localeCompare(b.plannedEndAt || "z")
        : sort === "created"
          ? b.createdAt.localeCompare(a.createdAt)
          : 0,
  );
  const selected = rows.find((t) => t.id === selectedId) || rows[0];
  return {
    app,
    a,
    setSelectedId,
    mode,
    setMode,
    q,
    setQ,
    project,
    setProject,
    tag,
    setTag,
    sort,
    setSort,
    data,
    rows,
    selected,
  };
}
