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
