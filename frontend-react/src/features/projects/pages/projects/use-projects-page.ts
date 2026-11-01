import type { FormEvent } from "react";
import { useState } from "react";
import type { Project, Task } from "../../../../../../shared/models";
import { localToInstant } from "../../../../../../shared/time";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { useTasks } from "../../../tasks/hooks/use-tasks";
export function useProjectsPage() {
  const app = useApp(),
    a = useTasks(),
    data = useApi<Project[]>("projects"),
    taskPreview = useApi<Task[]>("tasks/priorities");
  const [editor, setEditor] = useState<Project | true | null>(null),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("name"),
    [deleting, setDeleting] = useState<Project | null>(null);
  const rows = (data.data || [])
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) &&
        (filter === "all" || (filter === "archived") === p.archived),
    )
    .sort((a, b) =>
      sort === "due"
        ? (a.dueAt || "z").localeCompare(b.dueAt || "z")
        : a.name.localeCompare(b.name),
    );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      p = editor === true ? null : editor;
    await app.mutate(
      p ? `projects/${p.id}` : "projects",
      p ? "PATCH" : "POST",
      {
        name: d.get("name"),
        description: d.get("description"),
        color: d.get("color"),
        icon: d.get("icon"),
        dueAt: d.get("due")
          ? localToInstant(String(d.get("due")), app.settings.timeZone)
          : null,
      },
    );
    setEditor(null);
  }
  return {
    app,
    a,
    data,
    taskPreview,
    editor,
    setEditor,
    q,
    setQ,
    filter,
    setFilter,
    sort,
    setSort,
    deleting,
    setDeleting,
    rows,
    save,
  };
}
