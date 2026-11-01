import { Inbox } from "lucide-react";

export function Empty({
  text = "Aucune tâche pour le moment.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Inbox />
      <p>{text}</p>
    </div>
  );
}
