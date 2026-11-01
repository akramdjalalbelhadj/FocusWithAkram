import { useState } from "react";
import { Link } from "react-router-dom";
import {
  House,
  ListChecks,
  Timer,
  ChartNoAxesColumn,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Maximize,
} from "lucide-react";
import {
  type Task,
  type DashboardSummary,
  type DayHistory,
  type SessionType,
  type Productivity,
  type PriorityMode,
  QUADRANT_META,
  STATUS_LABEL,
} from "../../shared/models";
import {
  formatDuration,
  formatClock,
  formatDay,
  formatTime,
  addDays,
} from "../../shared/time";
import { query, useApi } from "./api";
import { useApp, safely } from "./state";
import { useTasks, TaskRow } from "./tasks";
import {
  Header,
  Modal,
  Empty,
  Loading,
  ErrorBox,
  Progress,
  qstyle,
} from "./ui";
import { NewTask, Filters } from "./planning";
export function Ring({
  seconds,
  progress = 0,
  small = false,
  label = "Concentration",
}: {
  seconds: number;
  progress?: number;
  small?: boolean;
  label?: string;
}) {
  return (
    <div className={`timer-ring ${small ? "small" : ""}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="54" className="track" />
        <circle
          cx="60"
          cy="60"
          r="54"
          className="value"
          strokeDasharray={339.3}
          strokeDashoffset={339.3 * (1 - Math.min(1, Math.max(0, progress)))}
        />
      </svg>
      <div>
        <strong role="timer">{formatClock(seconds)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
function Activity({
  rows,
}: {
  rows: { date: string; focusSeconds: number; tasksCompleted: number }[];
}) {
  const max = Math.max(60, ...rows.map((r) => r.focusSeconds));
  return (
    <>
      <div
        className="activity"
        role="img"
        aria-label="Temps de concentration par jour"
      >
        {rows.map((r) => (
          <div className="bar-column" key={r.date}>
            <span
              className="bar"
              title={`${r.date} : ${formatDuration(r.focusSeconds)}`}
              style={{ height: `${(100 * r.focusSeconds) / max}%` }}
            />
            <small>{r.date.slice(8)}</small>
          </div>
        ))}
      </div>
      <details>
        <summary>Afficher les données</summary>
        <table>
          <thead>
            <tr>
              <th>Jour</th>
              <th>Concentration</th>
              <th>Tâches terminées</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <th>{r.date}</th>
                <td>{formatDuration(r.focusSeconds)}</td>
                <td>{r.tasksCompleted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
export function DashboardPage() {
  const app = useApp(),
    actions = useTasks(),
    data = useApi<DashboardSummary>("dashboard/summary"),
    tasks = useApi<Task[]>("tasks/priorities"),
    [pick, setPick] = useState(false),
    [chosen, setChosen] = useState<string[]>([]);
  const d = data.data;
  return (
    <>
      <Header title="Tableau de bord" icon={<House />}>
        <NewTask />
      </Header>
      <section className="welcome card">
        <small>TON ESPACE DE PRODUCTIVITÉ</small>
        <h2>Bonjour Akram 👋</h2>
        <p>Une nouvelle journée pour avancer sur ce qui compte vraiment.</p>
      </section>
      <ErrorBox error={data.error} retry={data.refetch} />
      {!d ? (
        <Loading />
      ) : (
        <>
          <section className="kpis six">
            {[
              ["Tâches restantes", d.kpis.remainingTasks],
              ["Terminées aujourd’hui", d.kpis.completedToday],
              [
                "Objectif quotidien",
                `${Math.round(d.kpis.dailyGoalProgress * 100)} %`,
              ],
              [
                "Temps de concentration",
                formatDuration(d.kpis.focusSecondsToday),
              ],
              ["Pomodoros terminés", d.kpis.pomodorosToday],
              ["Tâches en retard", d.kpis.overdueTasks],
            ].map(([label, value]) => (
              <div className="card kpi" key={label}>
                <span className="kpi-icon">◈</span>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </section>
          <div className="dashboard-grid">
            <section className="card">
              <div className="section-head">
                <h2>Mes 3 priorités</h2>
                <button
                  onClick={() => {
                    setChosen(d.top3.tasks.map((t) => t.id));
                    setPick(true);
                  }}
                >
                  Choisir mes 3
                </button>
              </div>
              {d.top3.tasks.map((t) => (
                <div className="priority-row" key={t.id}>
                  <TaskRow task={t} compact />
                  {!t.archivedAt && (
                    <button
                      aria-label={`Commencer ${t.title}`}
                      onClick={() => safely(actions.focus(t))}
                    >
                      <Play size={16} />
                    </button>
                  )}
                </div>
              ))}
              {!d.top3.total && (
                <Empty text="Choisissez jusqu’à trois priorités pour aujourd’hui." />
              )}
              <p>
                Progression de la journée · {d.top3.done}/{d.top3.total}
              </p>
              <Progress
                value={d.top3.total ? (100 * d.top3.done) / d.top3.total : 0}
              />
            </section>
            <section className="card focus-compact">
              <h2>Ta prochaine session</h2>
              <Ring
                small
                seconds={app.remaining}
                progress={
                  app.session
                    ? 1 - app.remaining / app.session.plannedSeconds
                    : 0
                }
              />
              <button
                className="primary"
                disabled={app.busy}
                onClick={() =>
                  safely(
                    app.sessionAction(
                      app.session
                        ? app.session.status === "PAUSED"
                          ? "resume"
                          : "pause"
                        : "start",
                    ),
                  )
                }
              >
                {app.session
                  ? app.session.status === "PAUSED"
                    ? "Reprendre"
                    : "Pause"
                  : "Commencer"}
              </button>
              <Link to="/focus">Ouvrir Focus</Link>
            </section>
            <section className="card">
              <h2>Ta matrice en un regard</h2>
              <div className="mini-matrix">
                {d.matrix.map((q) => (
                  <Link
                    key={q.quadrant}
                    to="/matrix"
                    style={qstyle(q.quadrant)}
                  >
                    <strong>{q.count}</strong>
                    <span>{QUADRANT_META[q.quadrant].label}</span>
                    <small>{q.overdue} en retard</small>
                  </Link>
                ))}
              </div>
            </section>
            <section className="card">
              <h2>Activité de la semaine</h2>
              <p>Minutes de concentration par jour</p>
              <Activity rows={d.week} />
            </section>
          </div>
        </>
      )}
      {pick && (
        <Modal title="Choisir mes 3 priorités" close={() => setPick(false)}>
          {tasks.data?.map((t) => (
            <label className="choice" key={t.id}>
              <input
                type="checkbox"
                checked={chosen.includes(t.id)}
                disabled={!chosen.includes(t.id) && chosen.length >= 3}
                onChange={(e) =>
                  setChosen(
                    e.target.checked
                      ? [...chosen, t.id]
                      : chosen.filter((id) => id !== t.id),
                  )
                }
              />
              {t.title}
            </label>
          ))}
          <button
            className="primary"
            onClick={() =>
              safely(
                app
                  .mutate("dashboard/top3", "PUT", { taskIds: chosen })
                  .then(() => setPick(false)),
              )
            }
          >
            Enregistrer
          </button>
        </Modal>
      )}
    </>
  );
}
export function TasksPage() {
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
  return (
    <>
      <Header title="Mes tâches" icon={<ListChecks />}>
        <NewTask />
      </Header>
      <div className="intro">
        <small>ORGANISER ET AVANCER</small>
        <h2>Tout au même endroit ✦</h2>
        <p>
          Gère tes tâches selon leur urgence, leur priorité et ton planning.
        </p>
      </div>
      <div className="tasks-layout">
        <section className="card task-list">
          <div className="tabs">
            {[
              ["PRIORITIES", "Priorités"],
              ["TODAY", "Aujourd’hui"],
              ["WEEK", "Cette semaine"],
              ["ALL", "Toutes"],
              ["OVERDUE", "En retard"],
              ["DONE", "Terminées"],
            ].map(([m, label]) => (
              <button
                key={m}
                className={mode === m ? "selected" : ""}
                onClick={() => setMode(m as PriorityMode)}
              >
                {label}
              </button>
            ))}
          </div>
          <Filters {...{ q, setQ, project, setProject, tag, setTag }} />
          <div className="actions">
            <select
              aria-label="Trier par"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {[
                ["priority", "Priorité"],
                ["due", "Échéance"],
                ["title", "Titre"],
                ["created", "Création"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget,
                  title = String(new FormData(f).get("title")).trim();
                if (title)
                  safely(
                    app
                      .mutate("tasks", "POST", { title })
                      .then(() => f.reset()),
                  );
              }}
            >
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Ajout rapide…"
                aria-label="Ajout rapide"
              />
              <button>Ajouter</button>
            </form>
          </div>
          <ErrorBox error={data.error} retry={data.refetch} />
          {data.isLoading ? (
            <Loading />
          ) : rows.length ? (
            rows.map((t) => (
              <div key={t.id} onClick={() => setSelectedId(t.id)}>
                <TaskRow task={t} />
              </div>
            ))
          ) : (
            <Empty />
          )}
          <p>{rows.length} tâches</p>
        </section>
        {selected && (
          <aside className="card task-summary">
            <span className="qbadge" style={qstyle(selected.quadrant)}>
              {selected.quadrant} ·{" "}
              {selected.status === "IN_PROGRESS"
                ? "En cours"
                : selected.status === "DONE"
                  ? "Terminée"
                  : "À faire"}
            </span>
            <h2>{selected.title}</h2>
            <p>{selected.description || "Aucune description."}</p>
            <hr />
            <p>
              Échéance :{" "}
              {selected.plannedEndAt
                ? formatDay(selected.plannedEndAt, app.settings.timeZone)
                : "Sans date"}
            </p>
            <p>Estimation : {selected.estimatedMinutes ?? "—"} min</p>
            <p>
              Sous-tâches : {selected.subtasksDone}/{selected.subtasksTotal}
            </p>
            <Progress
              value={
                selected.subtasksTotal
                  ? (100 * selected.subtasksDone) / selected.subtasksTotal
                  : 0
              }
            />
            {selected.subtasks.map((sub) => (
              <p key={sub.id}>
                {sub.done ? "✓" : "□"} {sub.title}
              </p>
            ))}
            <button onClick={() => a.setDetail(selected.id)}>
              Ouvrir le détail complet
            </button>
            {!selected.archivedAt && (
              <button
                className="primary"
                onClick={() => safely(a.focus(selected))}
              >
                Démarrer un Pomodoro
              </button>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
export function FocusPage() {
  const app = useApp(),
    tasks = useApi<Task[]>("tasks/priorities"),
    history = useApi<DayHistory[]>("pomodoro/history/daily"),
    [type, setType] = useState<SessionType>("WORK"),
    [taskId, setTaskId] = useState(""),
    [config, setConfig] = useState(false);
  const s = app.session,
    cfg = app.settings,
    today = history.data?.find(
      (d) => d.date === formatDay(new Date(), cfg.timeZone),
    ),
    idle =
      (type === "WORK"
        ? cfg.workMinutes
        : type === "SHORT_BREAK"
          ? cfg.shortBreakMinutes
          : cfg.longBreakMinutes) * 60;
  return (
    <>
      <Header title="Focus / Pomodoro" icon={<Timer />}>
        <button onClick={() => setConfig(!config)}>Configurer</button>
        <button
          aria-label="Plein écran"
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else void document.documentElement.requestFullscreen();
          }}
        >
          <Maximize size={18} />
        </button>
      </Header>
      <div className="intro">
        <small>UN MOMENT POUR SOI, UN OBJECTIF À LA FOIS</small>
        <h2>
          Une chose à la fois. <em>Tout devient possible.</em>
        </h2>
        <p>Choisis ta tâche et offre-lui toute ton attention.</p>
      </div>
      {config && (
        <section className="card">
          <h2>Durées des sessions</h2>
          <div className="form-grid">
            {(
              [
                "workMinutes",
                "shortBreakMinutes",
                "longBreakMinutes",
                "sessionsBeforeLong",
              ] as const
            ).map((k) => (
              <label key={k}>
                {
                  {
                    workMinutes: "Concentration",
                    shortBreakMinutes: "Pause courte",
                    longBreakMinutes: "Pause longue",
                    sessionsBeforeLong: "Sessions avant pause longue",
                  }[k]
                }
                <input
                  type="number"
                  min={1}
                  defaultValue={cfg[k]}
                  onBlur={(e) =>
                    safely(
                      app.mutate("settings", "PATCH", {
                        [k]: Number(e.target.value),
                      }),
                    )
                  }
                />
              </label>
            ))}
          </div>
        </section>
      )}
      <div className="focus-layout">
        <section className="card timer-card">
          <div className="tabs">
            {(["WORK", "SHORT_BREAK", "LONG_BREAK"] as const).map((v, i) => (
              <button
                key={v}
                disabled={!!s}
                className={(s?.type || type) === v ? "selected" : ""}
                onClick={() => setType(v)}
              >
                {["Concentration", "Pause courte", "Pause longue"][i]}
              </button>
            ))}
          </div>
          <Ring
            label={
              {
                WORK: "Concentration",
                SHORT_BREAK: "Pause courte",
                LONG_BREAK: "Pause longue",
              }[s?.type || type]
            }
            seconds={s ? app.remaining : idle}
            progress={s ? 1 - app.remaining / s.plannedSeconds : 0}
          />
          <p>
            Pomodoro {s?.sequenceNumber ?? (today?.completedSessions || 0) + 1}{" "}
            · {s?.status === "PAUSED" ? "En pause" : s ? "En cours" : "Prêt"}
          </p>
          <div className="actions">
            <button
              aria-label="Réinitialiser"
              disabled={!s || app.busy}
              onClick={() => safely(app.sessionAction("cancel"))}
            >
              <RotateCcw size={18} />
            </button>
            <button
              className="primary"
              disabled={app.busy || app.offline}
              onClick={() =>
                safely(
                  app.sessionAction(
                    s ? (s.status === "PAUSED" ? "resume" : "pause") : "start",
                    type,
                    taskId || undefined,
                  ),
                )
              }
            >
              {s?.status === "RUNNING" ? (
                <Pause size={18} />
              ) : (
                <Play size={18} />
              )}{" "}
              {s ? (s.status === "PAUSED" ? "Reprendre" : "Pause") : "Démarrer"}
            </button>
            <button
              aria-label="Passer"
              disabled={!s || app.busy}
              onClick={() =>
                safely(
                  app.sessionAction("cancel").then(() => setType(s!.next.type)),
                )
              }
            >
              <SkipForward size={18} />
            </button>
          </div>
          {s ? (
            <p>{s.taskTitle || "Sans tâche associée"}</p>
          ) : (
            <label>
              Sur quelle tâche travailles-tu ?
              <select
                disabled={type !== "WORK"}
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
              >
                <option value="">Sans tâche associée</option>
                {tasks.data?.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
        <aside>
          <section className="card">
            <h2>Objectif quotidien</h2>
            <p>Ton temps de concentration</p>
            <p className="big-number">
              {formatDuration(today?.workedSeconds || 0)}{" "}
              <small>/ {formatDuration(cfg.dailyFocusGoalMinutes * 60)}</small>
            </p>
            <Progress
              value={
                ((today?.workedSeconds || 0) /
                  (cfg.dailyFocusGoalMinutes * 60)) *
                100
              }
            />
            <p>
              {today?.completedSessions || 0} Pomodoros terminés aujourd’hui
            </p>
          </section>
          <section className="card">
            <h2>Ton cycle Pomodoro</h2>
            <p>Concentration · {cfg.workMinutes} min</p>
            <p>Pause courte · {cfg.shortBreakMinutes} min</p>
            <p>
              Pause longue · {cfg.longBreakMinutes} min après{" "}
              {cfg.sessionsBeforeLong} sessions
            </p>
            <h3>Prochaine session</h3>
            <p>
              {s
                ? `${{ WORK: "Concentration", SHORT_BREAK: "Pause courte", LONG_BREAK: "Pause longue" }[s.next.type]} · ${formatDuration(s.next.plannedSeconds)}`
                : "Démarre une session pour commencer ton cycle."}
            </p>
          </section>
        </aside>
      </div>
      <section className="card history">
        <h2>Historique des Pomodoros</h2>
        <ErrorBox error={history.error} retry={history.refetch} />
        {history.data?.map((d) => (
          <section key={d.date}>
            <h3>
              {d.date} · {formatDuration(d.workedSeconds)} ·{" "}
              {d.completedSessions} terminés
            </h3>
            <div className="history-list">
              {d.sessions.map((s) => (
                <article key={s.id}>
                  <strong>{s.taskTitle || "Sans tâche"}</strong>
                  <span>
                    {formatTime(s.startedAt, cfg.timeZone)}–
                    {formatTime(s.endedAt, cfg.timeZone)}
                  </span>
                  <span>
                    {formatDuration(s.workedSeconds)} ·{" "}
                    {s.status === "COMPLETED" ? "Terminée" : "Interrompue"}
                  </span>
                </article>
              ))}
            </div>
          </section>
        ))}
        {!history.data?.length && (
          <Empty text="Vos sessions apparaîtront ici." />
        )}
      </section>
    </>
  );
}
export function StatisticsPage() {
  const app = useApp(),
    today = formatDay(new Date(), app.settings.timeZone),
    [from, setFrom] = useState(addDays(today, -29)),
    [to, setTo] = useState(today);
  const data = useApi<Productivity>(
      "statistics/productivity?" + query({ from, to }),
    ),
    heat = useApi<Productivity>(
      "statistics/productivity?" +
        query({ from: addDays(today, -364), to: today }),
    );
  const d = data.data;
  return (
    <>
      <Header title="Statistiques" icon={<ChartNoAxesColumn />} />
      <div className="intro">
        <small>TON PROGRÈS EN CHIFFRES</small>
        <h2>Chaque petit progrès compte ✦</h2>
        <p>Visualise tes habitudes et l’évolution de ta productivité.</p>
      </div>
      <div className="filters">
        {[1, 7, 30].map((n) => (
          <button
            key={n}
            onClick={() => {
              setFrom(addDays(today, 1 - n));
              setTo(today);
            }}
          >
            {n === 1 ? "Aujourd’hui" : `${n} jours`}
          </button>
        ))}
        <label>
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Au
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <ErrorBox error={data.error} retry={data.refetch} />
      {!d ? (
        <Loading />
      ) : (
        <>
          <div className="kpis">
            {[
              ["Tâches terminées", d.tasks.completed],
              ["Temps de concentration", formatDuration(d.focus.totalSeconds)],
              [
                "Taux de complétion",
                `${Math.round(d.tasks.completionRate * 100)} %`,
              ],
              ["Pomodoros réalisés", d.focus.completedSessions],
            ].map(([l, v]) => (
              <div key={l} className="card kpi">
                <strong>{v}</strong>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="stats-grid">
            <section className="card">
              <h2>Ton activité</h2>
              <Activity rows={d.daily} />
            </section>
            <section className="card">
              <h2>Répartition des tâches</h2>
              <QuadrantDonut counts={d.tasks.activeByQuadrant} />
              <div className="distribution">
                {Object.entries(d.tasks.activeByQuadrant).map(([q, n]) => (
                  <div key={q} style={qstyle(q as keyof typeof QUADRANT_META)}>
                    <span className="qbadge">{q}</span>
                    <span>
                      {QUADRANT_META[q as keyof typeof QUADRANT_META].label}
                    </span>
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
              <h3>Statuts</h3>
              {Object.entries(d.tasks.byStatus).map(([s, n]) => (
                <p key={s}>
                  {STATUS_LABEL[s as keyof typeof STATUS_LABEL]} : {n}
                </p>
              ))}
            </section>
            <section className="card">
              <h2>Régularité du focus</h2>
              <p>12 derniers mois</p>
              <div className="heatmap">
                {heat.data?.daily.map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date} : ${formatDuration(day.focusSeconds)}`}
                    style={{
                      background: day.focusSeconds
                        ? `color-mix(in srgb,var(--brand) ${Math.min(100, 20 + day.focusSeconds / 144)}%,var(--surface-3))`
                        : "var(--surface-3)",
                    }}
                  />
                ))}
              </div>
              <details>
                <summary>Afficher les données</summary>
                {heat.data?.daily.map((day) => (
                  <p key={day.date}>
                    {day.date} : {formatDuration(day.focusSeconds)}
                  </p>
                ))}
              </details>
            </section>
            <section className="card">
              <h2>Temps par projet</h2>
              {d.focus.byProject.map((p) => (
                <div key={p.projectId}>
                  <p>
                    {p.name} · {formatDuration(p.focusSeconds)}
                  </p>
                  <Progress
                    value={
                      d.focus.totalSeconds
                        ? (100 * p.focusSeconds) / d.focus.totalSeconds
                        : 0
                    }
                  />
                </div>
              ))}
              <h3>Temps par tâche</h3>
              {d.focus.byTask.map((t) => (
                <p key={t.taskId}>
                  {t.title} · {formatDuration(t.focusSeconds)}
                </p>
              ))}
            </section>
            <section className="card">
              <h2>Prévu et réalisé</h2>
              <p>
                Prévu : {formatDuration(d.planning.totalPlannedSeconds)} ·
                Écoulé : {formatDuration(d.planning.totalElapsedSeconds)} ·
                Actif : {formatDuration(d.planning.totalActiveSeconds)}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Tâche</th>
                    <th>Prévu</th>
                    <th>Réel</th>
                  </tr>
                </thead>
                <tbody>
                  {d.planning.comparisons.map((t) => (
                    <tr key={t.taskId + t.completedAt}>
                      <th>{t.title}</th>
                      <td>{formatDuration(t.plannedSeconds)}</td>
                      <td>{formatDuration(t.elapsedSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="card">
              <h2>Respect du planning</h2>
              <p>
                En avance : {d.planning.early} · À l’heure : {d.planning.onTime}{" "}
                · En retard : {d.planning.late}
              </p>
              <p>
                Écart moyen :{" "}
                {formatDuration(d.planning.averageEndVarianceSeconds)}
              </p>
              <p>
                {d.tasks.created} tâches créées · {d.tasks.overdueNow} en retard
              </p>
              <p>
                {d.focus.interruptedSessions} sessions interrompues · Durée
                moyenne : {formatDuration(d.focus.averageSessionSeconds)}
              </p>
              <p>{d.focus.daysGoalReached} journées avec objectif atteint</p>
            </section>
          </div>
        </>
      )}
    </>
  );
}

function QuadrantDonut({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  let offset = 0;
  return (
    <svg
      viewBox="0 0 200 200"
      className="donut"
      role="img"
      aria-label={`Répartition : ${total} tâches actives. Détail ci-dessous.`}
    >
      <circle
        cx="100"
        cy="100"
        r="75"
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="25"
      />
      {Object.entries(counts).map(([q, n]) => {
        const size = total ? (n / total) * 100 : 0;
        const start = offset;
        offset += size;
        return (
          <circle
            key={q}
            cx="100"
            cy="100"
            r="75"
            pathLength="100"
            fill="none"
            stroke={`var(--${q.toLowerCase()}-accent)`}
            strokeWidth="25"
            strokeDasharray={`${size} ${100 - size}`}
            strokeDashoffset={-start}
            transform="rotate(-90 100 100)"
          />
        );
      })}
      <text
        x="100"
        y="100"
        textAnchor="middle"
        fill="var(--fg)"
        fontSize="28"
        fontWeight="700"
      >
        {total}
      </text>
      <text
        x="100"
        y="123"
        textAnchor="middle"
        fill="var(--muted)"
        fontSize="12"
      >
        tâches actives
      </text>
    </svg>
  );
}
