import type { Project } from "../../../../../../shared/models";
import { useApi } from "../../../../core/api/use-api";

export function Filters({
  q,
  setQ,
  project,
  setProject,
  tag,
  setTag,
  status,
  setStatus,
  overdue,
  setOverdue,
}: {
  q: string;
  setQ: (v: string) => void;
  project: string;
  setProject: (v: string) => void;
  tag?: string;
  setTag?: (v: string) => void;
  status?: string;
  setStatus?: (v: string) => void;
  overdue?: boolean;
  setOverdue?: (v: boolean) => void;
}) {
  const projects = useApi<Project[]>("projects"),
    tags = useApi<string[]>("tags");
  return (
    <div className="filters" role="search">
      <input
        type="search"
        aria-label="Rechercher"
        placeholder="Rechercher une tâche…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
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
      {setStatus && (
        <select
          aria-label="Statut"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          <option value="TODO">À faire</option>
          <option value="IN_PROGRESS">En cours</option>
        </select>
      )}
      {setTag && (
        <select
          aria-label="Étiquette"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">Toutes les étiquettes</option>
          {tags.data?.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      )}
      {setOverdue && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={overdue}
            onChange={(e) => setOverdue(e.target.checked)}
          />
          En retard
        </label>
      )}
    </div>
  );
}
