import { House, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { QUADRANT_META } from "../../../../../../shared/models";
import { formatDuration } from "../../../../../../shared/time";
import { safely } from "../../../../core/utils/safely";
import { Activity } from "../../../../shared/charts/activity-chart/activity-chart";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { Empty } from "../../../../shared/ui/empty/empty";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Modal } from "../../../../shared/ui/modal/modal";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { Progress } from "../../../../shared/ui/progress/progress";
import { Ring } from "../../../pomodoro/components/timer-ring/timer-ring";
import { NewTask } from "../../../tasks/components/new-task-button/new-task-button";
import { TaskRow } from "../../../tasks/components/task-row/task-row";
import type { useDashboardPage } from "./use-dashboard-page";
export function DashboardPageView({
  app,
  actions,
  data,
  tasks,
  pick,
  setPick,
  chosen,
  setChosen,
  d,
}: ReturnType<typeof useDashboardPage>) {
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
