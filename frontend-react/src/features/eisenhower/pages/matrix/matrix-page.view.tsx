import { DragDropProvider } from "@dnd-kit/react";
import { Grid2X2, Plus } from "lucide-react";
import type { Quadrant } from "../../../../../../shared/models";
import { QUADRANT_META, QUADRANTS } from "../../../../../../shared/models";
import { safely } from "../../../../core/utils/safely";
import { qstyle } from "../../../../shared/styles/quadrant-style";
import { Empty } from "../../../../shared/ui/empty/empty";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { NewTask } from "../../../tasks/components/new-task-button/new-task-button";
import { Filters } from "../../../tasks/components/task-filters/task-filters";
import { TaskRow } from "../../../tasks/components/task-row/task-row";
import { DragTask } from "../../components/draggable-task/draggable-task";
import { Drop } from "../../components/quadrant-drop-zone/quadrant-drop-zone";
import { qicons } from "../../constants/quadrant-icons";
import type { useMatrixPage } from "./use-matrix-page";
export function MatrixPageView({
  app,
  a,
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
  mobile,
  setMobile,
  data,
  move,
}: ReturnType<typeof useMatrixPage>) {
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
