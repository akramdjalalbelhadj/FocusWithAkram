export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  let r: Response;
  try {
    r = await fetch("/api/v1/" + path, {
      method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Serveur indisponible. Vérifiez votre connexion et le backend Spring Boot.",
    );
  }
  if (!r.ok) {
    let p;
    try {
      p = await r.json();
    } catch {
      p = {};
    }
    throw new Error(
      [
        p.code,
        p.detail || `Erreur HTTP ${r.status}`,
        ...Object.values(p.errors || {}),
      ]
        .filter(Boolean)
        .join(" · "),
    );
  }
  if (r.status === 204) return undefined as T;
  return r.json();
}
