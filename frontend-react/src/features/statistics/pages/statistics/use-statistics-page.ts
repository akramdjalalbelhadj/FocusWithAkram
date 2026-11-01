import { useState } from "react";
import type { Productivity } from "../../../../../../shared/models";
import { addDays, formatDay } from "../../../../../../shared/time";
import { query } from "../../../../core/api/query";
import { useApi } from "../../../../core/api/use-api";
import { useApp } from "../../../../core/state/use-app";
export function useStatisticsPage() {
  const app = useApp(),
    today = formatDay(new Date(), app.settings.timeZone),
    [from, setFrom] = useState(addDays(today, -29)),
    [to, setTo] = useState(today);
  const data = useApi<Productivity>(
      "statistics/productivity?" + query({ from, to }),
    ),
    heat = useApi<Productivity>(
      "statistics/productivity?" +
        query({ from: addDays(today, -364), to: today }),
    );
  const d = data.data;
  return { today, from, setFrom, to, setTo, data, heat, d };
}
