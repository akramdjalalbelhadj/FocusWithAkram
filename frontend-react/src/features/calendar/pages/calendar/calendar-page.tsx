import { CalendarPageView } from "./calendar-page.view";
import { useCalendarPage } from "./use-calendar-page";

export function CalendarPage() {
  return <CalendarPageView {...useCalendarPage()} />;
}
