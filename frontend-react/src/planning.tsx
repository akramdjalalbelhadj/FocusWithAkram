import { useState, type ReactNode } from "react";
import { DragDropProvider, useDraggable, useDroppable } from "@dnd-kit/react";
import {
  Grid2X2,
  CalendarDays,
  Plus,
  Zap,
  Users,
  Trash2,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import {
  QUADRANTS,
  QUADRANT_META,
  type Matrix,
  type Project,
  type Quadrant,
  type Task,
  type Page,
} from "../../shared/models";
import {
  formatDay,
  formatTime,
  addDays,
  startOfWeek,
  startOfDayInstant,
  localToInstant,
  dayLabel,
  monthName,
  weekdayName,
} from "../../shared/time";
import { api, query, useApi } from "./api";
import { useApp, safely } from "./state";
import { useTasks, TaskRow } from "./tasks";
import { Header, Empty, Loading, ErrorBox, qstyle } from "./ui";
export const qicons = { Q1: Zap, Q2: CalendarDays, Q3: Users, Q4: Trash2 };
export function NewTask() {
  const a = useTasks();
  return (
    <button className="primary" onClick={() => a.setEditor({})}>
      <Plus size={18} />
      Nouvelle tâche
    </button>
  );
}
export function Filters({
  q,
  setQ,
  project,
  setProject,
  tag,
  setTag,
  status,
  setStatus,
  overdue,
  setOverdue,
}: {
  q: string;
  setQ: (v: string) => void;
  project: string;
  setProject: (v: string) => void;
  tag?: string;
  setTag?: (v: string) => void;
  status?: string;
  setStatus?: (v: string) => void;
  overdue?: boolean;
  setOverdue?: (v: boolean) => void;
}) {
  const projects = useApi<Project[]>("projects"),
    tags = useApi<string[]>("tags");
  return (
    <div className="filters" role="search">
      <input
        type="search"
        aria-label="Rechercher"
        placeholder="Rechercher une tâche…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select
        aria-label="Projet"
        value={project}
        onChange={(e) => setProject(e.target.value)}
      >
        <option value="">Tous les projets</option>
        {projects.data?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {setStatus && (
        <select
          aria-label="Statut"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="TODO">À faire</option>
          <option value="IN_PROGRESS">En cours</option>
        </select>
      )}
      {setTag && (
        <select
          aria-label="Étiquette"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">Toutes les étiquettes</option>
          {tags.data?.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      )}
      {setOverdue && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
          />
          En retard
        </label>
      )}
    </div>
  );
}
function Drop({
  id,
  children,
  className = "",
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { ref, isDropTarget } = useDroppable({ id });
  return (
    <div
      ref={ref}
      className={`${className} ${isDropTarget ? "drop-target" : ""}`}
    >
      {children}
    </div>
  );
}
function DragTask({ task, children }: { task: Task; children: ReactNode }) {
  const { ref, handleRef } = useDraggable({ id: task.id });
  return (
    <div ref={ref} className="draggable">
      <button
        ref={handleRef}
        className="drag-handle"
        aria-label={`Déplacer ${task.title}`}
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}
export function MatrixPage() {
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
  return (
    <>
      <Header title="Matrice d’Eisenhower" icon={<Grid2X2 />}>
        <NewTask />
      </Header>
      <Filters
        {...{
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
        }}
      />
      <ErrorBox error={data.error} retry={data.refetch} />
      {data.isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="quadrant-tabs" role="tablist" aria-label="Quadrants">
            {data.data?.quadrants.map((v) => (
              <button
                role="tab"
                aria-selected={mobile === v.quadrant}
                onClick={() => setMobile(v.quadrant)}
                key={v.quadrant}
              >
                {v.quadrant} · {v.count}
              </button>
            ))}
          </div>
          <DragDropProvider
            onDragEnd={(event) => {
              if (event.canceled) return;
              const task = data.data?.quadrants
                  .flatMap((v) => v.tasks)
                  .find((t) => t.id === event.operation.source?.id),
                target = String(event.operation.target?.id || "");
              if (task) {
                const destination = data.data?.quadrants.find((v) =>
                  v.tasks.some((t) => "position:" + t.id === target),
                );
                if (destination)
                  safely(
                    move(
                      task,
                      destination.quadrant,
                      destination.tasks.findIndex(
                        (t) => "position:" + t.id === target,
                      ),
                    ),
                  );
                else if (QUADRANTS.includes(target as Quadrant))
                  safely(move(task, target as Quadrant));
              }
            }}
          >
            <div className="matrix-grid">
              {data.data?.quadrants.map((v) => {
                const Icon = qicons[v.quadrant];
                return (
                  <section
                    className={`quadrant ${mobile !== v.quadrant ? "mobile-hidden" : ""}`}
                    style={qstyle(v.quadrant)}
                    key={v.quadrant}
                  >
                    <header>
                      <span className="quadrant-icon">
                        <Icon />
                      </span>
                      <div>
                        <h2>{QUADRANT_META[v.quadrant].label}</h2>
                        <p>
                          {v.count} tâches · {QUADRANT_META[v.quadrant].hint}
                        </p>
                      </div>
                      <span className="qbadge">{v.quadrant}</span>
                    </header>
                    <Drop id={v.quadrant} className="quadrant-body">
                      {v.tasks.map((t, index) => (
                        <div
                          key={t.id}
                          onKeyDown={(e) => {
                            if (!e.altKey) return;
                            if (/^[1-4]$/.test(e.key)) {
                              e.preventDefault();
                              safely(move(t, QUADRANTS[Number(e.key) - 1]));
                            } else if (
                              ["ArrowUp", "ArrowDown"].includes(e.key)
                            ) {
                              e.preventDefault();
                              safely(
                                move(
                                  t,
                                  t.quadrant,
                                  Math.max(
                                    0,
                                    index + (e.key === "ArrowUp" ? -1 : 1),
                                  ),
                                ),
                              );
                            }
                          }}
                        >
                          <Drop id={"position:" + t.id}>
                            <DragTask task={t}>
                              <TaskRow task={t} compact />
                            </DragTask>
                          </Drop>
                        </div>
                      ))}
                      {!v.count && (
                        <Empty text="Aucune tâche dans ce quadrant." />
                      )}
                    </Drop>
                    <form
                      className="quick-add"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = e.currentTarget,
                          title = String(new FormData(f).get("title")).trim();
                        if (title)
                          safely(
                            app
                              .mutate("tasks", "POST", {
                                title,
                                quadrant: v.quadrant,
                              })
                              .then(() => f.reset()),
                          );
                      }}
                    >
                      <Plus size={20} />
                      <input
                        name="title"
                        maxLength={200}
                        required
                        aria-label={`Ajout rapide dans ${QUADRANT_META[v.quadrant].label}`}
                        placeholder="Ajouter une tâche…"
                      />
                      <button
                        className="icon-btn"
                        type="button"
                        aria-label={`Formulaire ${v.quadrant}`}
                        onClick={() => a.setEditor({ quadrant: v.quadrant })}
                      >
                        …
                      </button>
                    </form>
                  </section>
                );
              })}
            </div>
          </DragDropProvider>
        </>
      )}
    </>
  );
}
export function CalendarPage() {
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
  const row = (t: Task) => (
    <button
      key={t.id}
      className="calendar-event"
      style={qstyle(t.quadrant)}
      onClick={() => a.setDetail(t.id)}
    >
      <span className="qbadge">{t.quadrant}</span>
      <strong>{t.title}</strong>
      <small>
        {formatTime(t.plannedEndAt, tz)}{" "}
        {t.status === "IN_PROGRESS" ? "· En cours" : ""}{" "}
        {t.overdue ? "· En retard" : ""}
      </small>
    </button>
  );
  return (
    <>
      <Header title="Calendrier" icon={<CalendarDays />}>
        <NewTask />
      </Header>
      <div className="calendar-controls">
        <div className="tabs">
          {[
            ["month", "Mois"],
            ["week", "Semaine"],
            ["day", "Jour"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={view === id}
              className={view === id ? "selected" : ""}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button aria-label="Période précédente" onClick={() => shift(-1)}>
          <ChevronLeft />
        </button>
        <h2>
          {view === "month"
            ? `${monthName(Number(anchor.slice(5, 7)))} ${anchor.slice(0, 4)}`
            : dayLabel(anchor)}
        </h2>
        <button aria-label="Période suivante" onClick={() => shift(1)}>
          <ChevronRight />
        </button>
        <button
          onClick={() => {
            setAnchor(today);
            setSelected(today);
          }}
        >
          Aujourd’hui
        </button>
        <select
          aria-label="Projet"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="">Tous les projets</option>
          {projects.data?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <ErrorBox
        error={data.error || unplanned.error}
        retry={() => {
          void data.refetch();
          void unplanned.refetch();
        }}
      />
      {data.isLoading ? (
        <Loading />
      ) : (
        <div className="calendar-layout">
          <div>
            {view === "month" ? (
              <DragDropProvider
                onDragEnd={(e) => {
                  if (e.canceled) return;
                  const t = tasks.find((t) => t.id === e.operation.source?.id),
                    day = String(e.operation.target?.id || "");
                  if (t && /^\d{4}-\d{2}-\d{2}$/.test(day))
                    safely(reschedule(t, day));
                }}
              >
                <div className="month card">
                  <div className="weekdays">
                    {days.slice(0, 7).map((d) => (
                      <strong key={d}>{weekdayName(d).slice(0, 3)}</strong>
                    ))}
                  </div>
                  <div className="month-grid" role="group" aria-label="Mois">
                    {days.map((d) => (
                      <Drop id={d} key={d}>
                        <div
                          className={`day ${selected === d ? "selected" : ""} ${d.slice(0, 7) !== anchor.slice(0, 7) ? "outside" : ""}`}
                          role="group"
                          tabIndex={0}
                          aria-label={dayLabel(d)}
                          onClick={() => setSelected(d)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelected(d);
                            }
                          }}
                        >
                          <span className={d === today ? "today" : ""}>
                            {Number(d.slice(8))}
                          </span>
                          {forDay(d)
                            .slice(0, 3)
                            .map((t) => (
                              <DragTask key={t.id} task={t}>
                                {row(t)}
                              </DragTask>
                            ))}
                          {forDay(d).length > 3 && (
                            <small>+{forDay(d).length - 3} autres</small>
                          )}
                          {forDay(d).length > 0 && (
                            <span className="mobile-dot" />
                          )}
                        </div>
                      </Drop>
                    ))}
                  </div>
                </div>
              </DragDropProvider>
            ) : (
              <div className={view === "week" ? "week-view" : "day-view"}>
                {days.map((d) => (
                  <section className="card" key={d}>
                    <h3>{dayLabel(d)}</h3>
                    {forDay(d).map(row)}
                    {!forDay(d).length && <Empty text="Aucune échéance." />}
                  </section>
                ))}
              </div>
            )}
            {data.data && data.data.totalItems > tasks.length && (
              <p>
                Seules les {tasks.length} premières tâches sont affichées.
                Affinez la période ou le projet.
              </p>
            )}
          </div>
          <aside className="calendar-side">
            <section className="card">
              <h2>Détails du jour</h2>
              <p>{dayLabel(selected)}</p>
              {forDay(selected).map(row)}
              {!forDay(selected).length && (
                <Empty text="Aucune tâche prévue ce jour-là." />
              )}
            </section>
            <section className="card">
              <h2>Tâches non planifiées</h2>
              <p>{unplanned.data?.totalItems ?? 0} tâches</p>
              {unplanned.data?.items.map((t) => (
                <TaskRow key={t.id} task={t} compact />
              ))}
              {!unplanned.data?.totalItems && (
                <Empty text="Toutes vos tâches ont une échéance." />
              )}
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
