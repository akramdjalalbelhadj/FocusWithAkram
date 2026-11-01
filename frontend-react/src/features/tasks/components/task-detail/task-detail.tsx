import { Play, Plus, Timer } from "lucide-react";
import { useState } from "react";
import type {
  Task,
  TaskExecution,
  TimelineEvent,
} from "../../../../../../shared/models";
import { STATUS_LABEL } from "../../../../../../shared/models";
import {
  formatDateTime,
  formatDuration,
  localToInstant,
} from "../../../../../../shared/time";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { safely } from "../../../../core/utils/safely";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Modal } from "../../../../shared/ui/modal/modal";
import { useTasks } from "../../hooks/use-tasks";

export function TaskDetail({ id, close }: { id: string; close: () => void }) {
  const app = useApp(),
    actions = useTasks(),
    data = useApi<Task>(`tasks/${id}`),
    cycles = useApi<TaskExecution[]>(`tasks/${id}/executions`),
    timeline = useApi<TimelineEvent[]>(`tasks/${id}/timeline`),
    [correct, setCorrect] = useState(false),
    [actual, setActual] = useState("");
  const t = data.data;
  const dates: Record<string, string> = {
    createdAt: "Création",
    plannedStartAt: "Début prévu",
    plannedEndAt: "Fin prévue",
    actualStartAt: "Début réel",
    actualEndAt: "Fin réelle",
    archivedAt: "Archivage",
  };
  return (
    <Modal title="Détail de la tâche" close={close} wide>
      <ErrorBox error={data.error} retry={data.refetch} />
      {!t ? (
        <Loading />
      ) : (
        <>
          <span className="qbadge" style={qstyle(t.quadrant)}>
            {t.quadrant} · {STATUS_LABEL[t.status]}
          </span>
          <h2>{t.title}</h2>
          <p>{t.description}</p>
          <div className="actions">
            <button onClick={() => actions.setEditor({ task: t })}>
              Modifier
            </button>
            {!t.archivedAt ? (
              <>
                <button
                  className="primary"
                  onClick={() => safely(actions.focus(t))}
                >
                  <Timer size={16} />
                  Démarrer un Pomodoro
                </button>
                <button onClick={() => safely(actions.complete(t))}>
                  Terminer
                </button>
                {t.status === "TODO" && (
                  <button
                    onClick={() => safely(app.mutate(`tasks/${id}/start`))}
                  >
                    <Play size={16} />
                    Commencer
                  </button>
                )}
              </>
            ) : (
              <button onClick={() => safely(app.mutate(`tasks/${id}/restore`))}>
                Restaurer
              </button>
            )}
          </div>
          <h3>Planification et réalisation</h3>
          <dl className="facts">
            {Object.entries(dates).map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>
                  {formatDateTime(
                    t[k as keyof Task] as string | null,
                    app.settings.timeZone,
                  ) || "—"}
                </dd>
              </div>
            ))}
            {Object.entries({
              plannedDurationSeconds: "Durée prévue",
              actualElapsedSeconds: "Durée réelle écoulée",
              activeSeconds: "Temps actif Pomodoro",
              startVarianceSeconds: "Écart de début",
              endVarianceSeconds: "Écart de fin",
              durationVarianceSeconds: "Écart de durée",
            }).map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>
                  {formatDuration(
                    t.timing[k as keyof typeof t.timing] as number | null,
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {!t.archivedAt && (
            <button onClick={() => setCorrect(!correct)}>
              Corriger le début réel
            </button>
          )}
          {correct && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = localToInstant(actual, app.settings.timeZone);
                if (value)
                  safely(
                    app
                      .mutate(`tasks/${id}/start`, "POST", {
                        actualStartAt: value,
                      })
                      .then(() => setCorrect(false)),
                  );
              }}
            >
              <label>
                Début réel
                <input
                  type="datetime-local"
                  required
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                />
              </label>
              <button>Corriger</button>
            </form>
          )}
          <h3>Sous-tâches</h3>
          {t.subtasks.map((s) => (
            <div className="subtask" key={s.id}>
              <label>
                <input
                  type="checkbox"
                  checked={s.done}
                  disabled={app.busy}
                  onChange={(e) =>
                    safely(
                      app.mutate(`tasks/${id}/subtasks/${s.id}`, "PATCH", {
                        done: e.target.checked,
                      }),
                    )
                  }
                />
                {s.title}
              </label>
              <button
                aria-label={`Supprimer ${s.title}`}
                onClick={() =>
                  safely(
                    app.mutate(
                      `tasks/${id}/subtasks/${s.id}`,
                      "DELETE",
                      undefined,
                    ),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget,
                title = String(new FormData(form).get("subtask")).trim();
              if (title)
                safely(
                  app
                    .mutate(`tasks/${id}/subtasks`, "POST", { title })
                    .then(() => form.reset()),
                );
            }}
          >
            <input
              name="subtask"
              aria-label="Nouvelle sous-tâche"
              maxLength={200}
              required
            />
            <button>
              <Plus size={16} />
              Ajouter
            </button>
          </form>
          <h3>Notes</h3>
          <p className="preserve">{t.notes || "Aucune note."}</p>
          <h3>Chronologie</h3>
          {timeline.data?.map((ev) => (
            <p key={ev.type}>
              {
                {
                  CREATED: "Création",
                  PLANNED_START: "Début prévu",
                  ACTUAL_START: "Début réel",
                  PLANNED_END: "Fin prévue",
                  ACTUAL_END: "Fin réelle",
                  ARCHIVED: "Archivage",
                }[ev.type]
              }{" "}
              ·{" "}
              {formatDateTime(ev.at, app.settings.timeZone) || "Non renseigné"}{" "}
              {ev.occurred ? "" : "· À venir"}
            </p>
          ))}
          <h3>Cycles d’exécution</h3>
          {cycles.data?.map((c) => (
            <section className="card" key={c.executionNumber}>
              <h4>
                Cycle {c.executionNumber}
                {c.current ? " · actuel" : ""}
              </h4>
              <p>
                Prévu : {formatDuration(c.timing.plannedDurationSeconds)} · Réel
                : {formatDuration(c.timing.actualElapsedSeconds)} · Actif :{" "}
                {formatDuration(c.timing.activeSeconds)}
              </p>
              {c.sessions.map((s) => (
                <p key={s.id}>
                  {formatDateTime(s.startedAt, app.settings.timeZone)} ·{" "}
                  {formatDuration(s.workedSeconds)} ·{" "}
                  {
                    {
                      RUNNING: "En cours",
                      PAUSED: "En pause",
                      COMPLETED: "Terminée",
                      CANCELLED: "Interrompue",
                    }[s.status]
                  }
                </p>
              ))}
            </section>
          ))}
          <ErrorBox
            error={cycles.error || timeline.error}
            retry={() => {
              void cycles.refetch();
              void timeline.refetch();
            }}
          />
        </>
      )}
    </Modal>
  );
}
