import { safely } from "../../../../core/utils/safely";
import { numeric } from "../../constants/numeric-settings";
import { pomodoroOptions, usePomodoroSettings } from "./use-pomodoro-settings";
import "./pomodoro-settings.css";

export function PomodoroSettings() {
  const { app, save, notice, draft: settings, change } = usePomodoroSettings();
  return (
    <section
      className="card pomodoro-settings"
      id="pomodoro-settings"
      aria-labelledby="pomodoro-settings-title"
    >
      <h2 id="pomodoro-settings-title">Minuteur Pomodoro</h2>
      <p>
        Les nouvelles durées s’appliquent aux prochaines sessions ; la session
        en cours conserve sa durée.
      </p>
      <form onSubmit={(event) => safely(save(event))}>
        <div className="pomodoro-settings-grid">
          {numeric.map(([key, label, min, max]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                name={key}
                value={Number.isNaN(settings[key]) ? "" : settings[key]}
                disabled={app.busy}
                onChange={(event) =>
                  change(
                    key,
                    event.target.value === ""
                      ? NaN
                      : Number(event.target.value),
                  )
                }
                required
                min={min}
                max={max}
                step={1}
              />
            </label>
          ))}
          <div className="pomodoro-settings-field">
            <label htmlFor="pomodoro-sound">Son de fin de session</label>
            <select
              id="pomodoro-sound"
              name="soundName"
              value={settings.soundName}
              disabled={app.busy}
              onChange={(event) =>
                change(
                  "soundName",
                  event.target.value as typeof settings.soundName,
                )
              }
            >
              <option value="bell">Cloche</option>
              <option value="chime">Carillon</option>
              <option value="soft">Doux</option>
            </select>
          </div>
        </div>
        {pomodoroOptions.map(([key, label]) => (
          <label className="pomodoro-settings-choice" key={key}>
            <input
              type="checkbox"
              name={key}
              checked={settings[key]}
              disabled={app.busy}
              onChange={(event) => change(key, event.target.checked)}
            />
            {label}
          </label>
        ))}
        {notice && <p role="status">{notice}</p>}
        <button className="primary" disabled={app.busy}>
          Enregistrer le minuteur
        </button>
      </form>
    </section>
  );
}
