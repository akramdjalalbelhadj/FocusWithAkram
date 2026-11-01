import type { FormEvent } from "react";
import { useState } from "react";
import type { ImportReport, Settings } from "../../../../../../shared/models";
import { useApp } from "../../../../core/state/use-app";
import { bools } from "../../constants/boolean-settings";
export function useSettingsPage() {
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
      };
    bools.forEach(([k]) => {
      patch[k] = d.has(k);
    });
    await app.mutate("settings", "PATCH", patch);
  }
  return { app, s, file, setFile, report, setReport, scope, setScope, save };
}
