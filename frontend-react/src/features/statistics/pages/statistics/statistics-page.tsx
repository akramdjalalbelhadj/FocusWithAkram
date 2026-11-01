import { StatisticsPageView } from "./statistics-page.view";
import { useStatisticsPage } from "./use-statistics-page";

export function StatisticsPage() {
  return <StatisticsPageView {...useStatisticsPage()} />;
}
