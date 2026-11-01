import { useQuery } from "@tanstack/react-query";
export function query(values: Record<string, unknown>) {
  const p = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
}
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
export function useApi<T>(path: string | null) {
  return useQuery<T, Error>({
    queryKey: [path],
    queryFn: () => api<T>(path!),
    enabled: path !== null,
    retry: 1,
  });
}
export async function download(path: string, name: string) {
  const r = await fetch("/api/v1/" + path);
  if (!r.ok) throw new Error("Export impossible");
  const u = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
