import { useState } from "react";
import type {
  ArchivedTask,
  DayCount,
  Page,
} from "../../../../../../shared/models";
import { query } from "../../../../core/api/query";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
export function useArchivesPage() {
  const app = useApp(),
    [q, setQ] = useState(""),
    [project, setProject] = useState(""),
    [quadrant, setQuadrant] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0),
    [order, setOrder] = useState("desc");
  const data = useApi<Page<ArchivedTask>>(
      "tasks/archives?" +
        query({
          q,
          projectId: project,
          quadrant,
          from,
          to,
          page,
          size: 30,
          order,
        }),
    ),
    facets = useApi<DayCount[]>("tasks/archives/facets");
  const labels: Record<string, string> = {
    TODAY: "Aujourd’hui",
    YESTERDAY: "Hier",
    THIS_WEEK: "Cette semaine",
    THIS_MONTH: "Ce mois-ci",
    PREVIOUS_MONTHS: "Mois précédents",
    PREVIOUS_YEARS: "Années précédentes",
  };
  const groups = new Map<string, ArchivedTask[]>();
  for (const item of data.data?.items || []) {
    const key = item.section + "|" + item.day;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return {
    app,
    q,
    setQ,
    project,
    setProject,
    quadrant,
    setQuadrant,
    from,
    setFrom,
    to,
    setTo,
    page,
    setPage,
    order,
    setOrder,
    data,
    facets,
    labels,
    groups,
  };
}
