import { TasksPageView } from "./tasks-page.view";
import { useTasksPage } from "./use-tasks-page";

export function TasksPage() {
  return <TasksPageView {...useTasksPage()} />;
}
