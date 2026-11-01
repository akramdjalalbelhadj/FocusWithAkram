import { ChartNoAxesColumn } from "lucide-react";
import { QUADRANT_META, STATUS_LABEL } from "../../../../../../shared/models";
import { addDays, formatDuration } from "../../../../../../shared/time";
import { Activity } from "../../../../shared/charts/activity-chart/activity-chart";
import { QuadrantDonut } from "../../../../shared/charts/quadrant-donut/quadrant-donut";
import { heatIntensity } from "../../../../shared/styles/data-styles";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { Progress } from "../../../../shared/ui/progress/progress";
import type { useStatisticsPage } from "./use-statistics-page";
export function StatisticsPageView({
  today,
  from,
  setFrom,
  to,
  setTo,
  data,
  heat,
  d,
}: ReturnType<typeof useStatisticsPage>) {
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
                    style={heatIntensity(day.focusSeconds)}
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
