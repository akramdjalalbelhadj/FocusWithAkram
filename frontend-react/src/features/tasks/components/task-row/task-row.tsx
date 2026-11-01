import { Check, MoreHorizontal, Square } from "lucide-react";
import type { Task } from "../../../../../../shared/models";
import { QUADRANTS, STATUS_LABEL } from "../../../../../../shared/models";
import { formatDateTime } from "../../../../../../shared/time";
import { useApp } from "../../../../core/state/use-app";
import { safely } from "../../../../core/utils/safely";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { Progress } from "../../../../shared/ui/progress/progress";
import { useTasks } from "../../hooks/use-tasks";

export function TaskRow({
  task: t,
  compact = false,
}: {
  task: Task;
  compact?: boolean;
}) {
  const a = useTasks(),
    app = useApp();
  return (
    <article
      className={`task-row ${compact ? "compact" : ""}`}
      style={qstyle(t.quadrant)}
      aria-label={t.title}
    >
      <button
        className="icon-btn check"
        aria-label="Terminer la tâche"
        disabled={t.status === "DONE" || app.busy}
        onClick={() => safely(a.complete(t))}
      >
        {t.status === "DONE" ? <Check /> : <Square />}
      </button>
      <div className="task-content">
        <button className="task-title" onClick={() => a.setDetail(t.id)}>
          {t.title}
        </button>
        <div className="task-meta">
          {!compact && (
            <span className="qbadge">
              {t.quadrant} · {STATUS_LABEL[t.status]}
            </span>
          )}
          {!compact && t.project && <span>{t.project.name}</span>}
          {t.plannedEndAt && (
            <time className={t.overdue ? "overdue" : ""}>
              {formatDateTime(t.plannedEndAt, app.settings.timeZone)}
            </time>
          )}
          {!compact && t.tags.map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
        {!compact && t.subtasksTotal > 0 && (
          <div className="task-progress">
            <Progress value={(100 * t.subtasksDone) / t.subtasksTotal} />
            <small>
              {t.subtasksDone}/{t.subtasksTotal}
            </small>
          </div>
        )}
      </div>
      <details className="task-menu">
        <summary aria-label="Actions sur la tâche">
          <MoreHorizontal size={19} />
        </summary>
        <div className="menu">
          <button onClick={() => a.setDetail(t.id)}>Ouvrir le détail</button>
          {!t.archivedAt ? (
            <>
              <button onClick={() => a.setEditor({ task: t })}>Modifier</button>
              <button
                onClick={() =>
                  safely(
                    app.mutate(
                      `tasks/${t.id}/${t.status === "TODO" ? "start" : "status"}`,
                      t.status === "TODO" ? "POST" : "PATCH",
                      t.status === "TODO" ? {} : { status: "TODO" },
                    ),
                  )
                }
              >
                {t.status === "TODO" ? "Commencer la tâche" : "Mettre en pause"}
              </button>
              <button onClick={() => safely(a.complete(t))}>
                Terminer la tâche
              </button>
              <button onClick={() => safely(a.focus(t))}>
                Démarrer un Pomodoro
              </button>
              {QUADRANTS.filter((q) => q !== t.quadrant).map((q) => (
                <button
                  key={q}
                  onClick={() =>
                    safely(
                      app.mutate(`tasks/${t.id}/quadrant`, "PATCH", {
                        quadrant: q,
                      }),
                    )
                  }
                >
                  Déplacer vers {q}
                </button>
              ))}
            </>
          ) : (
            <button onClick={() => safely(app.mutate(`tasks/${t.id}/restore`))}>
              Restaurer
            </button>
          )}
          <button onClick={() => safely(app.mutate(`tasks/${t.id}/duplicate`))}>
            Dupliquer
          </button>
          <button className="danger" onClick={() => a.setDeletion(t)}>
            Supprimer
          </button>
        </div>
      </details>
    </article>
  );
}
