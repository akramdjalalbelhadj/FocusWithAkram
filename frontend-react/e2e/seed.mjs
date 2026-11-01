// Only the explicitly isolated backend on port 18080 is eligible for test mutations.
const base = "http://127.0.0.1:18080/api/v1/";
export async function api(path, method = "GET", body) {
  const r = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.status === 204 ? null : r.json();
}
export async function seed() {
  const existing = await api("projects");
  if (existing.some((p) => p.name === "Recette · FocusWithAkram")) return;
  const p = await api("projects", "POST", {
    name: "Recette · FocusWithAkram",
    description: "Données isolées de comparaison UI",
    color: "#9650f5",
  });
  const p2 = await api("projects", "POST", {
    name: "Recette · Formation",
    description: "Apprendre chaque jour",
    color: "#13b998",
  });
  const titles = [
    "Finaliser la présentation",
    "Corriger le bug critique",
    "Répondre aux emails urgents",
    "Préparer le sprint prochain",
    "Lire le livre sur la productivité",
    "Planifier les objectifs du mois",
    "Mettre à jour la documentation",
    "Organiser le déplacement",
    "Trier les anciens fichiers",
  ];
  const ids = [];
  for (let i = 0; i < titles.length; i++) {
    const quadrant = i < 3 ? "Q1" : i < 6 ? "Q2" : i < 8 ? "Q3" : "Q4";
    const day = String(1 + i * 2).padStart(2, "0");
    const t = await api("tasks", "POST", {
      title: titles[i],
      quadrant,
      description: "Tâche de recette persistée dans PostgreSQL isolé.",
      projectId: i % 3 ? p.id : p2.id,
      estimatedMinutes: 30 + i * 5,
      tags: ["recette"],
      subtasks: ["Préparer", "Vérifier", "Finaliser"],
      plannedStartAt: i === 8 ? null : `2026-11-${day}T08:00:00Z`,
      plannedEndAt: i === 8 ? null : `2026-11-${day}T10:00:00Z`,
    });
    ids.push(t.id);
  }
  await api("dashboard/top3", "PUT", { taskIds: [ids[0], ids[3], ids[4]] });
  await api(`tasks/${ids[0]}/start`, "POST", {});
  await api("settings", "PATCH", {
    theme: "LIGHT",
    timeZone: "Europe/Paris",
    soundEnabled: false,
    notificationsEnabled: false,
  });
}
if (process.argv[1]?.endsWith("seed.mjs")) await seed();
