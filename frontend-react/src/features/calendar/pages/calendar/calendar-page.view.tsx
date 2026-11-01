import { DragDropProvider } from "@dnd-kit/react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Task } from "../../../../../../shared/models";
import {
  dayLabel,
  formatTime,
  monthName,
  weekdayName,
} from "../../../../../../shared/time";
import { safely } from "../../../../core/utils/safely";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { Empty } from "../../../../shared/ui/empty/empty";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { DragTask } from "../../../eisenhower/components/draggable-task/draggable-task";
import { Drop } from "../../../eisenhower/components/quadrant-drop-zone/quadrant-drop-zone";
import { NewTask } from "../../../tasks/components/new-task-button/new-task-button";
import { TaskRow } from "../../../tasks/components/task-row/task-row";
import type { useCalendarPage } from "./use-calendar-page";
export function CalendarPageView({
  today,
  anchor,
  setAnchor,
  selected,
  setSelected,
  view,
  setView,
  project,
  setProject,
  projects,
  days,
  data,
  unplanned,
  tasks,
  forDay,
  shift,
  reschedule,
  a,
  tz,
}: ReturnType<typeof useCalendarPage>) {
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
