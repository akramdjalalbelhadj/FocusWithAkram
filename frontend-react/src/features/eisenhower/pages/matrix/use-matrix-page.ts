import { useState } from "react";
import type { Matrix, Quadrant, Task } from "../../../../../../shared/models";
import { api } from "../../../../core/api/http-client";
import { query } from "../../../../core/api/query";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { useTasks } from "../../../tasks/hooks/use-tasks";
export function useMatrixPage() {
  const app = useApp(),
    a = useTasks();
  const [q, setQ] = useState(""),
    [project, setProject] = useState(""),
    [status, setStatus] = useState(""),
    [tag, setTag] = useState(""),
    [overdue, setOverdue] = useState(false),
    [mobile, setMobile] = useState<Quadrant>("Q1");
  const data = useApi<Matrix>(
    "eisenhower/matrix?" +
      query({
        q,
        projectId: project,
        status,
        tag,
        overdue: overdue || undefined,
      }),
  );
  async function move(task: Task, target: Quadrant, index?: number) {
    if (app.busy) return;
    const full = await api<Matrix>("eisenhower/matrix").catch((e: Error) => {
      app.setError(e.message);
      throw e;
    });
    const before = full.quadrants
      .find((v) => v.quadrant === task.quadrant)!
      .tasks.map((t) => t.id);
    const dest = full.quadrants
      .find((v) => v.quadrant === target)!
      .tasks.filter((t) => t.id !== task.id)
      .map((t) => t.id);
    dest.splice(index ?? dest.length, 0, task.id);
    await app.mutate(
      "tasks/reorder",
      "PATCH",
      { quadrant: target, taskIds: dest },
      "Déplacement enregistré.",
    );
    app.setUndo(() => async () => {
      await app.mutate(
        "tasks/reorder",
        "PATCH",
        { quadrant: task.quadrant, taskIds: before },
        "Déplacement annulé.",
      );
      app.setUndo(null);
    });
  }
  return {
    app,
    a,
    q,
    setQ,
    project,
    setProject,
    status,
    setStatus,
    tag,
    setTag,
    overdue,
    setOverdue,
    mobile,
    setMobile,
    data,
    move,
  };
}
