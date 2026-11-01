import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { Play, MoreHorizontal, Plus, Check, Square, Timer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  QUADRANTS,
  QUADRANT_META,
  STATUS_LABEL,
  type Task,
  type Project,
  type Quadrant,
  type TaskExecution,
  type TimelineEvent,
  type CreateTaskInput,
} from "../../shared/models";
import {
  formatDateTime,
  localToInstant,
  formatDuration,
} from "../../shared/time";
import { useApi } from "./api";
import { useApp, safely } from "./state";
import { Modal, ErrorBox, Loading, Progress, qstyle } from "./ui";
type Editor = { task?: Task; quadrant?: Quadrant; projectId?: string };
function useActions() {
  const app = useApp(),
    navigate = useNavigate();
  const [editor, setEditor] = useState<Editor | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [completion, setCompletion] = useState<Task | null>(null),
    [deletion, setDeletion] = useState<Task | null>(null);
  async function complete(t: Task) {
    if (!t.actualStartAt) {
      setCompletion(t);
      return;
    }
    await app.mutate(`tasks/${t.id}/complete`);
  }
  async function focus(t: Task) {
    await app.sessionAction("start", "WORK", t.id);
    navigate("/focus");
  }
  return {
    editor,
    setEditor,
    detail,
    setDetail,
    completion,
    setCompletion,
    deletion,
    setDeletion,
    complete,
    focus,
  };
}
const TaskContext = createContext<ReturnType<typeof useActions> | null>(null);
export function useTasks() {
  return useContext(TaskContext)!;
}
export function TaskProvider({ children }: { children: ReactNode }) {
  const a = useActions(),
    app = useApp();
  return (
    <TaskContext.Provider value={a}>
      {children}
      {a.editor && (
        <TaskForm editor={a.editor} close={() => a.setEditor(null)} />
      )}
      {a.detail && <TaskDetail id={a.detail} close={() => a.setDetail(null)} />}
      {a.completion && (
        <Modal
          title="Renseigner le début réel"
          close={() => a.setCompletion(null)}
        >
          <p>
            Cette tâche n’a pas été démarrée. Indiquez quand vous avez
            réellement commencé.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget),
                actualStartAt = localToInstant(
                  String(d.get("start")),
                  app.settings.timeZone,
                );
              if (!actualStartAt) return;
              safely(
                app
                  .mutate(`tasks/${a.completion!.id}/complete`, "POST", {
                    actualStartAt,
                  })
                  .then(() => a.setCompletion(null)),
              );
            }}
          >
            <label>
              Début réel ({app.settings.timeZone})
              <input name="start" type="datetime-local" required />
            </label>
            <button className="primary" disabled={app.busy}>
              Terminer la tâche
            </button>
          </form>
        </Modal>
      )}
      {a.deletion && (
        <Modal
          title="Supprimer cette tâche ?"
          close={() => a.setDeletion(null)}
        >
          <p>{a.deletion.title}</p>
          <p>Cette suppression est définitive.</p>
          <button
            className="danger"
            disabled={app.busy}
            onClick={() =>
              safely(
                app
                  .mutate(`tasks/${a.deletion!.id}`, "DELETE", undefined)
                  .then(() => {
                    a.setDeletion(null);
                    a.setDetail(null);
                  }),
              )
            }
          >
            Supprimer
          </button>
        </Modal>
      )}
    </TaskContext.Provider>
  );
}
export function TaskForm({
  editor,
  close,
}: {
  editor: Editor;
  close: () => void;
}) {
  const app = useApp(),
    projects = useApi<Project[]>("projects"),
    t = editor.task;
  const [error, setError] = useState("");
  const [start, setStart] = useState(
      formatDateTime(t?.plannedStartAt, app.settings.timeZone).replace(
        " ",
        "T",
      ),
    ),
    [end, setEnd] = useState(
      formatDateTime(t?.plannedEndAt, app.settings.timeZone).replace(" ", "T"),
    );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const d = new FormData(e.currentTarget);
    const input: CreateTaskInput = {
      title: String(d.get("title")).trim(),
      description: String(d.get("description")),
      notes: String(d.get("notes")),
      quadrant: d.get("quadrant") as Quadrant,
      projectId: String(d.get("projectId")) || null,
      tags: String(d.get("tags"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      estimatedMinutes: d.get("estimate") ? Number(d.get("estimate")) : null,
    };
    if (!t?.archivedAt) {
      input.plannedStartAt = start
        ? localToInstant(start, app.settings.timeZone)
        : null;
      input.plannedEndAt = end
        ? localToInstant(end, app.settings.timeZone)
        : null;
    }
    if (
      input.plannedStartAt &&
      input.plannedEndAt &&
      input.plannedStartAt >= input.plannedEndAt
    ) {
      setError("Le début prévu doit précéder la fin prévue.");
      return;
    }
    if (!t)
      input.subtasks = String(d.get("subtasks"))
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    try {
      await app.mutate(
        t ? `tasks/${t.id}` : "tasks",
        t ? "PATCH" : "POST",
        input,
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title={t ? "Modifier la tâche" : "Nouvelle tâche"} close={close}>
      <form onSubmit={save}>
        <label>
          Titre
          <input
            name="title"
            required
            maxLength={200}
            autoFocus
            defaultValue={t?.title}
          />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={t?.description || ""} />
        </label>
        <div className="form-grid">
          <label>
            Quadrant
            <select
              name="quadrant"
              defaultValue={t?.quadrant || editor.quadrant || "Q2"}
            >
              {QUADRANTS.map((q) => (
                <option key={q} value={q}>
                  {q} · {QUADRANT_META[q].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Projet
            <select
              name="projectId"
              defaultValue={t?.project?.id || editor.projectId || ""}
            >
              <option value="">Sans projet</option>
              {projects.data
                ?.filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Début prévu
            <input
              type="datetime-local"
              value={start}
              disabled={!!t?.archivedAt}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Fin prévue
            <input
              type="datetime-local"
              value={end}
              disabled={!!t?.archivedAt}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <small>
          Fuseau : {app.settings.timeZone}. Durée prévue :{" "}
          {start && end
            ? formatDuration(
                (Date.parse(localToInstant(end, app.settings.timeZone)!) -
                  Date.parse(localToInstant(start, app.settings.timeZone)!)) /
                  1000,
              )
            : "—"}
        </small>
        <div className="form-grid">
          <label>
            Estimation (minutes)
            <input
              name="estimate"
              type="number"
              min={1}
              max={100000}
              defaultValue={t?.estimatedMinutes || ""}
            />
          </label>
          <label>
            Étiquettes (virgules)
            <input name="tags" defaultValue={t?.tags.join(", ")} />
          </label>
        </div>
        {!t && (
          <label>
            Sous-tâches (une par ligne)
            <textarea name="subtasks" />
          </label>
        )}
        <label>
          Notes
          <textarea name="notes" defaultValue={t?.notes || ""} />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={close}>
            Annuler
          </button>
          <button className="primary" disabled={app.busy}>
            Enregistrer
          </button>
        </footer>
      </form>
    </Modal>
  );
}
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
