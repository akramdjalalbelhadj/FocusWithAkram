import { ProjectsPageView } from "./projects-page.view";
import { useProjectsPage } from "./use-projects-page";

export function ProjectsPage() {
  return <ProjectsPageView {...useProjectsPage()} />;
}
