import { Settings as SettingsIcon } from "lucide-react";
import type { ImportReport } from "../../../../../../shared/models";
import { download } from "../../../../core/api/download";
import { safely } from "../../../../core/utils/safely";
import { ErrorBox } from "../../../../shared/ui/error-box/error-box";
import { Header } from "../../../../shared/ui/page-header/page-header";
import { bools } from "../../constants/boolean-settings";
import type { useSettingsPage } from "./use-settings-page";
export function SettingsPageView({
  app,
  s,
  file,
  setFile,
  report,
  setReport,
  scope,
  setScope,
  save,
}: ReturnType<typeof useSettingsPage>) {
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
