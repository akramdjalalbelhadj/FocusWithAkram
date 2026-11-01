import { Folder, Plus } from "lucide-react";
import { formatDateTime } from "../../../../../../shared/time";
import { safely } from "../../../../core/utils/safely";
import { projectColor } from "../../../../shared/styles/data-styles";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Loading } from "../../../../shared/ui/loading/loading";
import { Modal } from "../../../../shared/ui/modal/modal";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { Progress } from "../../../../shared/ui/progress/progress";
import { ProjectIcon } from "../../components/project-icon/project-icon";
import type { useProjectsPage } from "./use-projects-page";
export function ProjectsPageView({
  app,
  a,
  data,
  taskPreview,
  editor,
  setEditor,
  q,
  setQ,
  filter,
  setFilter,
  sort,
  setSort,
  deleting,
  setDeleting,
  rows,
  save,
}: ReturnType<typeof useProjectsPage>) {
  return (
    <>
      <Header title="Projets" icon={<Folder />}>
        <button className="primary" onClick={() => setEditor(true)}>
          <Plus size={18} />
          Nouveau projet
        </button>
      </Header>
      <div className="intro">
        <small>TRANSFORMER LES IDÉES EN ACTIONS</small>
        <h2>Mes projets ✦</h2>
        <p>Une vision claire de tous tes projets et de leur avancement.</p>
      </div>
      <div className="filters">
        <input
          type="search"
          aria-label="Rechercher un projet"
          placeholder="Rechercher un projet…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {[
          ["all", "Tous les projets"],
          ["active", "Actifs"],
          ["archived", "Archivés"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={filter === v ? "selected" : ""}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
        <select
          aria-label="Trier les projets"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Nom</option>
          <option value="due">Échéance</option>
        </select>
      </div>
      <ErrorBox error={taskPreview.error} retry={taskPreview.refetch} />
      <ErrorBox error={data.error} retry={data.refetch} />
      {data.isLoading ? (
        <Loading />
      ) : (
        <div className="project-grid">
          {rows.map((p) => (
            <article
              className="card project-card"
              key={p.id}
              style={projectColor(p.color)}
            >
              <span className="project-icon">
                <ProjectIcon name={p.icon} />
              </span>
              <h2>{p.name}</h2>
              <p>{p.description}</p>
              <p>
                {p.doneTasks} sur {p.totalTasks} tâches ·{" "}
                {p.totalTasks
                  ? Math.round((100 * p.doneTasks) / p.totalTasks)
                  : 0}{" "}
                %
              </p>
              <Progress
                value={p.totalTasks ? (100 * p.doneTasks) / p.totalTasks : 0}
              />
              <div className="project-preview">
                {taskPreview.data
                  ?.filter((t) => t.project?.id === p.id)
                  .slice(0, 2)
                  .map((t) => (
                    <button key={t.id} onClick={() => a.setDetail(t.id)}>
                      □ {t.title}
                    </button>
                  ))}
              </div>
              <p>
                {p.archived ? "Archivé" : "Actif"} ·{" "}
                {formatDateTime(p.dueAt, app.settings.timeZone) ||
                  "Sans échéance"}
              </p>
              <div className="actions">
                <button onClick={() => setEditor(p)}>Modifier</button>
                <button onClick={() => a.setEditor({ projectId: p.id })}>
                  + Tâche
                </button>
                <button
                  onClick={() =>
                    safely(
                      app.mutate(`projects/${p.id}`, "PATCH", {
                        archived: !p.archived,
                      }),
                    )
                  }
                >
                  {p.archived ? "Restaurer" : "Archiver"}
                </button>
                <button className="danger" onClick={() => setDeleting(p)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
          <button className="card new-project" onClick={() => setEditor(true)}>
            <Plus />
            <strong>Un nouveau projet ?</strong>
            <span>Donne une place à ta prochaine idée.</span>
          </button>
        </div>
      )}
      {editor && (
        <Modal
          title={editor === true ? "Nouveau projet" : "Modifier le projet"}
          close={() => setEditor(null)}
        >
          <form onSubmit={(e) => safely(save(e))}>
            <label>
              Nom
              <input
                name="name"
                maxLength={120}
                required
                defaultValue={editor === true ? "" : editor.name}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                defaultValue={editor === true ? "" : editor.description || ""}
              />
            </label>
            <label>
              Couleur
              <input
                name="color"
                type="color"
                defaultValue={editor === true ? "#7437f6" : editor.color}
              />
            </label>
            <label>
              Icône
              <select
                name="icon"
                defaultValue={
                  editor === true ? "folder" : editor.icon || "folder"
                }
              >
                <option value="folder">Dossier</option>
                <option value="target">Objectif</option>
                <option value="coffee">Personnel</option>
                <option value="layers">Apprentissage</option>
              </select>
            </label>
            <label>
              Échéance
              <input
                name="due"
                type="datetime-local"
                defaultValue={
                  editor === true
                    ? ""
                    : formatDateTime(
                        editor.dueAt,
                        app.settings.timeZone,
                      ).replace(" ", "T")
                }
              />
            </label>
            <button className="primary" disabled={app.busy}>
              Enregistrer
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Supprimer le projet ?" close={() => setDeleting(null)}>
          <p>{deleting.name}. Les tâches seront conservées.</p>
          <button
            className="danger"
            onClick={() =>
              safely(
                app
                  .mutate(`projects/${deleting.id}`, "DELETE", undefined)
                  .then(() => setDeleting(null)),
              )
            }
          >
            Supprimer
          </button>
        </Modal>
      )}
    </>
  );
}
