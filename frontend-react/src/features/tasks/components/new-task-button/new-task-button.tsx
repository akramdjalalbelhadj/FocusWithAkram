import { Plus } from "lucide-react";
import { useTasks } from "../../hooks/use-tasks";

export function NewTask() {
  const a = useTasks();
  return (
    <button className="primary" onClick={() => a.setEditor({})}>
      <Plus size={18} />
      Nouvelle tâche
    </button>
  );
}
