import type { FormEvent } from "react";
import { useState } from "react";
import type {
  CreateTaskInput,
  Project,
  Quadrant,
} from "../../../../../../shared/models";
import { QUADRANT_META, QUADRANTS } from "../../../../../../shared/models";
import {
  formatDateTime,
  formatDuration,
  localToInstant,
} from "../../../../../../shared/time";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
import { Modal } from "../../../../shared/ui/modal/modal";
import type { Editor } from "../../types/task-editor";

export function TaskForm({
  editor,
  close,
}: {
  editor: Editor;
  close: () => void;
}) {
  const app = useApp(),
    projects = useApi<Project[]>("projects"),
    t = editor.task;
  const [error, setError] = useState("");
  const [start, setStart] = useState(
      formatDateTime(t?.plannedStartAt, app.settings.timeZone).replace(
        " ",
        "T",
      ),
    ),
    [end, setEnd] = useState(
      formatDateTime(t?.plannedEndAt, app.settings.timeZone).replace(" ", "T"),
    );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const d = new FormData(e.currentTarget);
    const input: CreateTaskInput = {
      title: String(d.get("title")).trim(),
      description: String(d.get("description")),
      notes: String(d.get("notes")),
      quadrant: d.get("quadrant") as Quadrant,
      projectId: String(d.get("projectId")) || null,
      tags: String(d.get("tags"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      estimatedMinutes: d.get("estimate") ? Number(d.get("estimate")) : null,
    };
    if (!t?.archivedAt) {
      input.plannedStartAt = start
        ? localToInstant(start, app.settings.timeZone)
        : null;
      input.plannedEndAt = end
        ? localToInstant(end, app.settings.timeZone)
        : null;
    }
    if (
      input.plannedStartAt &&
      input.plannedEndAt &&
      input.plannedStartAt >= input.plannedEndAt
    ) {
      setError("Le début prévu doit précéder la fin prévue.");
      return;
    }
    if (!t)
      input.subtasks = String(d.get("subtasks"))
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    try {
      await app.mutate(
        t ? `tasks/${t.id}` : "tasks",
        t ? "PATCH" : "POST",
        input,
      );
      close();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal title={t ? "Modifier la tâche" : "Nouvelle tâche"} close={close}>
      <form onSubmit={save}>
        <label>
          Titre
          <input
            name="title"
            required
            maxLength={200}
            autoFocus
            defaultValue={t?.title}
          />
        </label>
        <label>
          Description
          <textarea name="description" defaultValue={t?.description || ""} />
        </label>
        <div className="form-grid">
          <label>
            Quadrant
            <select
              name="quadrant"
              defaultValue={t?.quadrant || editor.quadrant || "Q2"}
            >
              {QUADRANTS.map((q) => (
                <option key={q} value={q}>
                  {q} · {QUADRANT_META[q].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Projet
            <select
              name="projectId"
              defaultValue={t?.project?.id || editor.projectId || ""}
            >
              <option value="">Sans projet</option>
              {projects.data
                ?.filter((p) => !p.archived)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Début prévu
            <input
              type="datetime-local"
              value={start}
              disabled={!!t?.archivedAt}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Fin prévue
            <input
              type="datetime-local"
              value={end}
              disabled={!!t?.archivedAt}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <small>
          Fuseau : {app.settings.timeZone}. Durée prévue :{" "}
          {start && end
            ? formatDuration(
                (Date.parse(localToInstant(end, app.settings.timeZone)!) -
                  Date.parse(localToInstant(start, app.settings.timeZone)!)) /
                  1000,
              )
            : "—"}
        </small>
        <div className="form-grid">
          <label>
            Estimation (minutes)
            <input
              name="estimate"
              type="number"
              min={1}
              max={100000}
              defaultValue={t?.estimatedMinutes || ""}
            />
          </label>
          <label>
            Étiquettes (virgules)
            <input name="tags" defaultValue={t?.tags.join(", ")} />
          </label>
        </div>
        {!t && (
          <label>
            Sous-tâches (une par ligne)
            <textarea name="subtasks" />
          </label>
        )}
        <label>
          Notes
          <textarea name="notes" defaultValue={t?.notes || ""} />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" onClick={close}>
            Annuler
          </button>
          <button className="primary" disabled={app.busy}>
            Enregistrer
          </button>
        </footer>
      </form>
    </Modal>
  );
}
