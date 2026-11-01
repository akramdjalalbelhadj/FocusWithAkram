import { ListChecks } from "lucide-react";
import type { PriorityMode } from "../../../../../../shared/models";
import { formatDay } from "../../../../../../shared/time";
import { safely } from "../../../../core/utils/safely";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { Empty } from "../../../../shared/ui/empty/empty";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { Progress } from "../../../../shared/ui/progress/progress";
import { NewTask } from "../../components/new-task-button/new-task-button";
import { Filters } from "../../components/task-filters/task-filters";
import { TaskRow } from "../../components/task-row/task-row";
import type { useTasksPage } from "./use-tasks-page";
export function TasksPageView({
  app,
  a,
  setSelectedId,
  mode,
  setMode,
  q,
  setQ,
  project,
  setProject,
  tag,
  setTag,
  sort,
  setSort,
  data,
  rows,
  selected,
}: ReturnType<typeof useTasksPage>) {
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
