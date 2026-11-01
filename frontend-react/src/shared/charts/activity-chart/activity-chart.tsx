import { formatDuration } from "../../../../../shared/time";
import { activityHeight } from "../../styles/data-styles";

export function Activity({
  rows,
}: {
  rows: { date: string; focusSeconds: number; tasksCompleted: number }[];
}) {
  const max = Math.max(60, ...rows.map((r) => r.focusSeconds));
  return (
    <>
      <div
        className="activity"
        role="img"
        aria-label="Temps de concentration par jour"
      >
        {rows.map((r) => (
          <div className="bar-column" key={r.date}>
            <span
              className="bar"
              title={`${r.date} : ${formatDuration(r.focusSeconds)}`}
              style={activityHeight(r.focusSeconds, max)}
            />
            <small>{r.date.slice(8)}</small>
          </div>
        ))}
      </div>
      <details>
        <summary>Afficher les données</summary>
        <table>
          <thead>
            <tr>
              <th>Jour</th>
              <th>Concentration</th>
              <th>Tâches terminées</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <th>{r.date}</th>
                <td>{formatDuration(r.focusSeconds)}</td>
                <td>{r.tasksCompleted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
