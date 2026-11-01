import { useState, type FormEvent } from "react";
import {
  Folder,
  Target,
  Coffee,
  Layers,
  Plus,
  Archive,
  Settings as SettingsIcon,
} from "lucide-react";
import {
  type Project,
  type Task,
  type Page,
  type ArchivedTask,
  type DayCount,
  type Settings,
  type ImportReport,
  QUADRANTS,
} from "../../shared/models";
import {
  formatDateTime,
  formatDuration,
  localToInstant,
} from "../../shared/time";
import { useApi, query, download } from "./api";
import { useApp, safely } from "./state";
import { useTasks, TaskRow } from "./tasks";
import { Header, Modal, Progress, Empty, Loading, ErrorBox } from "./ui";
import { Filters } from "./planning";
export function ProjectsPage() {
  const app = useApp(),
    a = useTasks(),
    data = useApi<Project[]>("projects"),
    taskPreview = useApi<Task[]>("tasks/priorities");
  const [editor, setEditor] = useState<Project | true | null>(null),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("all"),
    [sort, setSort] = useState("name"),
    [deleting, setDeleting] = useState<Project | null>(null);
  const rows = (data.data || [])
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q.toLowerCase()) &&
        (filter === "all" || (filter === "archived") === p.archived),
    )
    .sort((a, b) =>
      sort === "due"
        ? (a.dueAt || "z").localeCompare(b.dueAt || "z")
        : a.name.localeCompare(b.name),
    );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      p = editor === true ? null : editor;
    await app.mutate(
      p ? `projects/${p.id}` : "projects",
      p ? "PATCH" : "POST",
      {
        name: d.get("name"),
        description: d.get("description"),
        color: d.get("color"),
        icon: d.get("icon"),
        dueAt: d.get("due")
          ? localToInstant(String(d.get("due")), app.settings.timeZone)
          : null,
      },
    );
    setEditor(null);
  }
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
              style={{ borderTop: `3px solid ${p.color}` }}
            >
              <span className="project-icon" style={{ color: p.color }}>
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
export function ArchivesPage() {
  const app = useApp(),
    [q, setQ] = useState(""),
    [project, setProject] = useState(""),
    [quadrant, setQuadrant] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0),
    [order, setOrder] = useState("desc");
  const data = useApi<Page<ArchivedTask>>(
      "tasks/archives?" +
        query({
          q,
          projectId: project,
          quadrant,
          from,
          to,
          page,
          size: 30,
          order,
        }),
    ),
    facets = useApi<DayCount[]>("tasks/archives/facets");
  const labels: Record<string, string> = {
    TODAY: "Aujourd’hui",
    YESTERDAY: "Hier",
    THIS_WEEK: "Cette semaine",
    THIS_MONTH: "Ce mois-ci",
    PREVIOUS_MONTHS: "Mois précédents",
    PREVIOUS_YEARS: "Années précédentes",
  };
  const groups = new Map<string, ArchivedTask[]>();
  for (const item of data.data?.items || []) {
    const key = item.section + "|" + item.day;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
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
const numeric = [
  ["workMinutes", "Concentration (minutes)", 1, 180],
  ["shortBreakMinutes", "Pause courte (minutes)", 1, 60],
  ["longBreakMinutes", "Pause longue (minutes)", 1, 120],
  ["sessionsBeforeLong", "Sessions avant pause longue", 1, 12],
  ["dailyFocusGoalMinutes", "Objectif quotidien (minutes)", 0, 720],
] as const;
const bools = [
  ["autoStartBreaks", "Démarrer automatiquement les pauses"],
  ["autoStartWork", "Enchaîner automatiquement le travail"],
  ["soundEnabled", "Son de fin"],
  ["notificationsEnabled", "Notifications du navigateur"],
  ["subtasksCompleteParent", "Les sous-tâches font avancer la tâche parente"],
  ["shortcutsEnabled", "Activer les raccourcis"],
  ["compactMode", "Mode compact"],
] as const;
export function SettingsPage() {
  const app = useApp(),
    s = app.settings;
  const [file, setFile] = useState<unknown>(null),
    [report, setReport] = useState<ImportReport | null>(null),
    [scope, setScope] = useState("ALL");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      patch: Partial<Settings> = {
        theme: d.get("theme") as Settings["theme"],
        timeZone: String(d.get("timeZone")),
        weekStartsOn: d.get("weekStartsOn") as Settings["weekStartsOn"],
        soundName: d.get("soundName") as Settings["soundName"],
      };
    numeric.forEach(([k]) => {
      patch[k] = Number(d.get(k));
    });
    bools.forEach(([k]) => {
      patch[k] = d.has(k);
    });
    if (patch.notificationsEnabled && Notification.permission !== "granted")
      patch.notificationsEnabled =
        (await Notification.requestPermission()) === "granted";
    await app.mutate("settings", "PATCH", patch);
  }
  return (
    <>
      <Header title="Paramètres" icon={<SettingsIcon />} />
      <ErrorBox
        error={app.settingsQuery.error}
        retry={app.settingsQuery.refetch}
      />
      <form
        className="card"
        key={app.settingsQuery.dataUpdatedAt}
        onSubmit={(e) => safely(save(e))}
      >
        <h2>Apparence et calendrier</h2>
        <div className="form-grid">
          <label>
            Thème
            <select name="theme" defaultValue={s.theme}>
              <option value="LIGHT">Clair</option>
              <option value="DARK">Sombre</option>
              <option value="SYSTEM">Système</option>
            </select>
          </label>
          <label>
            Fuseau horaire
            <input
              name="timeZone"
              required
              defaultValue={s.timeZone}
              list="timezones"
            />
            <datalist id="timezones">
              {Intl.supportedValuesOf("timeZone").map((t) => (
                <option key={t}>{t}</option>
              ))}
            </datalist>
          </label>
          <label>
            Premier jour de semaine
            <select name="weekStartsOn" defaultValue={s.weekStartsOn}>
              <option value="MONDAY">Lundi</option>
              <option value="SUNDAY">Dimanche</option>
              <option value="SATURDAY">Samedi</option>
            </select>
          </label>
        </div>
        <h2>Focus et Pomodoro</h2>
        <div className="form-grid">
          {numeric.map(([k, l, min, max]) => (
            <label key={k}>
              {l}
              <input
                type="number"
                name={k}
                defaultValue={s[k]}
                required
                min={min}
                max={max}
              />
            </label>
          ))}
        </div>
        <label>
          Son
          <select name="soundName" defaultValue={s.soundName}>
            <option value="bell">Cloche</option>
            <option value="chime">Carillon</option>
            <option value="soft">Doux</option>
          </select>
        </label>
        {bools.map(([k, l]) => (
          <label className="choice" key={k}>
            <input type="checkbox" name={k} defaultChecked={s[k]} />
            {l}
          </label>
        ))}
        <button className="primary" disabled={app.busy}>
          Enregistrer les paramètres
        </button>
      </form>
      <section className="card">
        <h2>Export et sauvegarde</h2>
        <div className="actions">
          <select
            aria-label="Périmètre"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="ALL">Toutes les tâches</option>
            <option value="ACTIVE">Actives</option>
            <option value="ARCHIVED">Archivées</option>
          </select>
          {["csv", "json"].map((f) => (
            <button
              key={f}
              onClick={() =>
                safely(
                  download(
                    `export/tasks?format=${f}&scope=${scope}`,
                    `taches.${f}`,
                  ).catch((e) => app.setError(e.message)),
                )
              }
            >
              Exporter {f.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() =>
              safely(
                download("export/backup", "focuswithakram-backup.json").catch(
                  (e) => app.setError(e.message),
                ),
              )
            }
          >
            Sauvegarde complète
          </button>
        </div>
        <h2>Importer une sauvegarde JSON</h2>
        <label>
          Fichier
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              setReport(null);
              setFile(null);
              try {
                const f = e.target.files?.[0];
                if (f) {
                  const json = JSON.parse(await f.text());
                  setFile(json);
                  setReport(
                    await app.mutate<ImportReport>(
                      "import?dryRun=true",
                      "POST",
                      json,
                      "Aperçu prêt.",
                    ),
                  );
                }
              } catch (err) {
                app.setError((err as Error).message);
              }
            }}
          />
        </label>
        {report && (
          <>
            <p>
              {report.dryRun ? "Aperçu sans écriture" : "Import réalisé"} :{" "}
              {report.tasksCreated} tâches, {report.projectsCreated} projets,{" "}
              {report.sessionsCreated} sessions ; {report.tasksSkipped} tâches
              ignorées.
            </p>
            {report.errors.map((e, i) => (
              <p className="error" key={i}>
                {e}
              </p>
            ))}
            {report.dryRun && (
              <button
                className="primary"
                disabled={app.busy}
                onClick={() =>
                  safely(
                    app
                      .mutate<ImportReport>("import?dryRun=false", "POST", file)
                      .then(setReport),
                  )
                }
              >
                Confirmer l’import
              </button>
            )}
          </>
        )}
      </section>
      <section className="card">
        <h2>Raccourcis</h2>
        <p>
          Ctrl/⌘ K : rechercher · N : nouvelle tâche · Espace : Pomodoro · G
          puis D/M/T/F/C/S/A : naviguer · Échap : fermer
        </p>
        <p>
          Matrice : Alt + 1…4 pour changer de quadrant, Alt + ↑/↓ pour
          réordonner.
        </p>
      </section>
    </>
  );
}

function ProjectIcon({ name }: { name: string | null }) {
  const Icon =
    (
      { target: Target, coffee: Coffee, layers: Layers } as Record<
        string,
        typeof Folder
      >
    )[name || ""] || Folder;
  return <Icon />;
}
