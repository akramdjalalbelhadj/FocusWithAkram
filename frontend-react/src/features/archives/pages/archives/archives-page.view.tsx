import { Archive } from "lucide-react";
import { QUADRANTS } from "../../../../../../shared/models";
import { formatDateTime, formatDuration } from "../../../../../../shared/time";
import { download } from "../../../../core/api/download";
import { safely } from "../../../../core/utils/safely";
import { Empty } from "../../../../shared/ui/empty/empty";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { Filters } from "../../../tasks/components/task-filters/task-filters";
import { TaskRow } from "../../../tasks/components/task-row/task-row";
import type { useArchivesPage } from "./use-archives-page";
export function ArchivesPageView({
  app,
  q,
  setQ,
  project,
  setProject,
  quadrant,
  setQuadrant,
  from,
  setFrom,
  to,
  setTo,
  page,
  setPage,
  order,
  setOrder,
  data,
  facets,
  labels,
  groups,
}: ReturnType<typeof useArchivesPage>) {
  return (
    <>
      <Header title="Archives" icon={<Archive />}>
        <button
          onClick={() =>
            safely(
              download(
                "export/tasks?format=csv&scope=ARCHIVED",
                "archives.csv",
              ).catch((e) => app.setError(e.message)),
            )
          }
        >
          Exporter CSV
        </button>
        <button
          onClick={() =>
            safely(
              download(
                "export/tasks?format=json&scope=ARCHIVED",
                "archives.json",
              ).catch((e) => app.setError(e.message)),
            )
          }
        >
          Exporter JSON
        </button>
      </Header>
      <Filters
        q={q}
        setQ={(v) => {
          setQ(v);
          setPage(0);
        }}
        project={project}
        setProject={(v) => {
          setProject(v);
          setPage(0);
        }}
      />
      <div className="filters">
        <select
          aria-label="Quadrant"
          value={quadrant}
          onChange={(e) => {
            setQuadrant(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Tous les quadrants</option>
          {QUADRANTS.map((q) => (
            <option key={q}>{q}</option>
          ))}
        </select>
        <label>
          Du
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Au
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Ordre"
          value={order}
          onChange={(e) => {
            setOrder(e.target.value);
            setPage(0);
          }}
        >
          <option value="desc">Plus récentes</option>
          <option value="asc">Plus anciennes</option>
        </select>
        <select
          aria-label="Jour de fin"
          value=""
          onChange={(e) => {
            setFrom(e.target.value);
            setTo(e.target.value);
            setPage(0);
          }}
        >
          <option value="">Naviguer par date</option>
          {facets.data?.map((d) => (
            <option key={d.date} value={d.date}>
              {d.date} · {d.count}
            </option>
          ))}
        </select>
      </div>
      <ErrorBox error={data.error} retry={data.refetch} />
      {data.isLoading ? (
        <Loading />
      ) : (
        [...groups].map(([key, items]) => (
          <section className="card" key={key}>
            <h2>
              {labels[items[0].section]} · {items[0].day}
            </h2>
            {items.map(({ task: t }) => (
              <div key={t.id}>
                <TaskRow task={t} />
                <p>
                  Fin réelle :{" "}
                  {formatDateTime(t.actualEndAt, app.settings.timeZone)} · Prévu{" "}
                  {formatDuration(t.timing.plannedDurationSeconds)} · Écoulé{" "}
                  {formatDuration(t.timing.actualElapsedSeconds)} · Actif{" "}
                  {formatDuration(t.timing.activeSeconds)} ·{" "}
                  {t.timing.punctuality || "—"}
                </p>
              </div>
            ))}
          </section>
        ))
      )}
      {data.data?.totalItems === 0 && (
        <Empty text="Aucune tâche archivée sur cette période." />
      )}
      <div className="actions">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          Précédent
        </button>
        <span>
          Page {page + 1} / {Math.max(1, data.data?.totalPages || 0)}
        </span>
        <button
          disabled={page + 1 >= (data.data?.totalPages || 0)}
          onClick={() => setPage(page + 1)}
        >
          Suivant
        </button>
      </div>
    </>
  );
}
