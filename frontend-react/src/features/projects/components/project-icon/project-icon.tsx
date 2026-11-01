import { Coffee, Folder, Layers, Target } from "lucide-react";

export function ProjectIcon({ name }: { name: string | null }) {
  const Icon =
    (
      { target: Target, coffee: Coffee, layers: Layers } as Record<
        string,
        typeof Folder
      >
    )[name || ""] || Folder;
  return <Icon />;
}
