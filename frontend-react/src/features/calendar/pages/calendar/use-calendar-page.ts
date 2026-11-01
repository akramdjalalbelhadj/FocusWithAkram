import { useState } from "react";
import type { Page, Project, Task } from "../../../../../../shared/models";
import {
  addDays,
  formatDay,
  formatTime,
  localToInstant,
  startOfDayInstant,
  startOfWeek,
} from "../../../../../../shared/time";
import { query } from "../../../../core/api/query";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { useTasks } from "../../../tasks/hooks/use-tasks";
export function useCalendarPage() {
  const app = useApp(),
    a = useTasks(),
    tz = app.settings.timeZone,
    today = formatDay(new Date(), tz);
  const [anchor, setAnchor] = useState(today),
    [selected, setSelected] = useState(today),
    [view, setView] = useState("month"),
    [project, setProject] = useState("");
  const projects = useApi<Project[]>("projects");
  const first =
    view === "month"
      ? startOfWeek(anchor.slice(0, 7) + "-01", app.settings.weekStartsOn)
      : view === "week"
        ? startOfWeek(anchor, app.settings.weekStartsOn)
        : anchor;
  const days = Array.from(
    { length: view === "month" ? 42 : view === "week" ? 7 : 1 },
    (_, i) => addDays(first, i),
  );
  const data = useApi<Page<Task>>(
      "tasks?" +
        query({
          dueFrom: startOfDayInstant(first, tz),
          dueTo: startOfDayInstant(addDays(days.at(-1)!, 1), tz),
          projectId: project,
          size: 200,
          sort: "plannedEndAt",
          dir: "asc",
        }),
    ),
    unplanned = useApi<Page<Task>>(
      "tasks?" + query({ unplanned: true, projectId: project, size: 200 }),
    );
  const tasks = data.data?.items.filter((t) => !t.archivedAt) || [],
    forDay = (day: string) =>
      tasks.filter(
        (t) => t.plannedEndAt && formatDay(t.plannedEndAt, tz) === day,
      );
  function shift(n: number) {
    const next =
      view === "month"
        ? new Date(
            Date.UTC(
              Number(anchor.slice(0, 4)),
              Number(anchor.slice(5, 7)) - 1 + n,
              1,
            ),
          )
            .toISOString()
            .slice(0, 10)
        : addDays(anchor, n * (view === "week" ? 7 : 1));
    setAnchor(next);
    setSelected(next);
  }
  async function reschedule(t: Task, day: string) {
    if (!t.plannedEndAt) return;
    const old = formatDay(t.plannedEndAt, tz),
      delta = Math.round((Date.parse(day) - Date.parse(old)) / 86400000);
    await app.mutate(`tasks/${t.id}`, "PATCH", {
      plannedEndAt: localToInstant(
        `${day} ${formatTime(t.plannedEndAt, tz)}`,
        tz,
      ),
      plannedStartAt: t.plannedStartAt
        ? localToInstant(
            `${addDays(formatDay(t.plannedStartAt, tz), delta)} ${formatTime(t.plannedStartAt, tz)}`,
            tz,
          )
        : null,
    });
  }

  return {
    today,
    anchor,
    setAnchor,
    selected,
    setSelected,
    view,
    setView,
    project,
    setProject,
    projects,
    days,
    data,
    unplanned,
    tasks,
    forDay,
    shift,
    reschedule,
    a,
    tz,
  };
}
