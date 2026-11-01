import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { SearchResult } from "../../../../shared/models";
import { nav } from "../../app/navigation/navigation";
import { query } from "../../core/api/query";
import { useApi } from "../../core/api/use-api";
import { useApp } from "../../core/state/use-app";
import { safely } from "../../core/utils/safely";
import { useTasks } from "../../features/tasks/hooks/use-tasks";
import { ErrorBox } from "../../shared/ui/error-box/error-box";
import { Modal } from "../../shared/ui/modal/modal";

export function Palette({ close }: { close: () => void }) {
  const [q, setQ] = useState(""),
    data = useApi<SearchResult>(q ? "search?" + query({ q }) : null),
    a = useTasks(),
    navigate = useNavigate(),
    app = useApp();
  return (
    <Modal title="Rechercher ou lancer une commande" close={close}>
      <input
        autoFocus
        aria-label="Recherche globale"
        placeholder="Tâche, projet, commande…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div
        className="palette-results"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const buttons = [...e.currentTarget.querySelectorAll("button")];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            buttons[
              (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length
            ]?.focus();
          }
        }}
      >
        <button
          onClick={() => {
            a.setEditor({});
            close();
          }}
        >
          + Nouvelle tâche
        </button>
        <button
          onClick={() => {
            safely(app.sessionAction("start").then(() => navigate("/focus")));
            close();
          }}
        >
          Démarrer un Pomodoro
        </button>
        <button
          onClick={() =>
            safely(
              app
                .mutate("settings", "PATCH", {
                  theme: app.settings.theme === "DARK" ? "LIGHT" : "DARK",
                })
                .then(close),
            )
          }
        >
          Basculer le thème
        </button>
        {nav
          .filter(([, l]) => l.toLowerCase().includes(q.toLowerCase()))
          .map(([path, l]) => (
            <button
              key={path}
              onClick={() => {
                navigate(path);
                close();
              }}
            >
              {l}
            </button>
          ))}
        {data.data?.tasks.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              a.setDetail(t.id);
              close();
            }}
          >
            {t.quadrant} · {t.title}
          </button>
        ))}
        {data.data?.projects.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              navigate("/projects");
              close();
            }}
          >
            {p.name}
          </button>
        ))}
      </div>
      <ErrorBox error={data.error} retry={data.refetch} />
    </Modal>
  );
}
