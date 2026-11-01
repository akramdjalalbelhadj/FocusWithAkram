import { PomodoroSettings } from "../../components/pomodoro-settings/pomodoro-settings";
import {
  Maximize,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
} from "lucide-react";
import { formatDuration, formatTime } from "../../../../../../shared/time";
import { safely } from "../../../../core/utils/safely";
import { Empty } from "../../../../shared/ui/empty/empty";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { Progress } from "../../../../shared/ui/progress/progress";
import { Ring } from "../../components/timer-ring/timer-ring";
import type { useFocusPage } from "./use-focus-page";
export function FocusPageView({
  app,
  tasks,
  history,
  type,
  setType,
  taskId,
  setTaskId,
  config,
  setConfig,
  s,
  cfg,
  today,
  idle,
}: ReturnType<typeof useFocusPage>) {
  return (
    <>
      <Header title="Focus / Pomodoro" icon={<Timer />}>
        <button
          aria-expanded={config}
          aria-controls="pomodoro-settings"
          onClick={() => setConfig(!config)}
        >
          Configurer
        </button>
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
      {config && <PomodoroSettings />}
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
