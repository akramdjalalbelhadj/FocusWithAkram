import { useEffect, useState, type FormEvent } from "react";
import type { Settings } from "../../../../../../shared/models";
import { useApp } from "../../../../core/state/use-app";
import { numeric } from "../../constants/numeric-settings";

export const pomodoroOptions = [
  ["autoStartBreaks", "Démarrer automatiquement les pauses"],
  ["autoStartWork", "Enchaîner automatiquement la session suivante"],
  ["soundEnabled", "Activer le son"],
  ["notificationsEnabled", "Notifications du navigateur"],
] as const;

export function usePomodoroSettings() {
  const app = useApp();
  const [notice, setNotice] = useState("");

  const [draft, setDraft] = useState(app.settings);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(app.settings);
  }, [app.settings, dirty]);
  function change<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDirty(true);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const patch: Partial<Settings> = {
      soundName: data.get("soundName") as Settings["soundName"],
    };
    for (const [key, , min, max] of numeric) {
      const value = Number(data.get(key));
      if (!Number.isInteger(value) || value < min || value > max) {
        app.setError(`Valeur comprise entre ${min} et ${max} attendue.`);
        return;
      }
      patch[key] = value;
    }
    for (const [key] of pomodoroOptions) patch[key] = data.has(key);
    setNotice("");
    if (patch.notificationsEnabled) {
      const permission =
        "Notification" in window
          ? Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission()
          : "unsupported";
      if (permission !== "granted") {
        patch.notificationsEnabled = false;
        setNotice(
          "Les notifications restent désactivées : vérifiez les autorisations de votre navigateur.",
        );
      }
    }
    await app.mutate(
      "settings",
      "PATCH",
      patch,
      "Réglages Pomodoro enregistrés.",
    );
    setDirty(false);
  }

  return { app, save, notice, draft, change };
}
