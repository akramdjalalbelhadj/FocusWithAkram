import type { ReactNode } from "react";
import { localToInstant } from "../../../../../shared/time";
import { useApp } from "../../../core/state/use-app";
import { safely } from "../../../core/utils/safely";
import { Modal } from "../../../shared/ui/modal/modal";
import { TaskDetail } from "../components/task-detail/task-detail";
import { TaskForm } from "../components/task-form/task-form";
import { TaskContext } from "./task-context";
import { useActions } from "../hooks/use-task-actions";

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
