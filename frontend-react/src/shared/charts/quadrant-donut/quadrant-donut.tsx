export function QuadrantDonut({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  let offset = 0;
  return (
    <svg
      viewBox="0 0 200 200"
      className="donut"
      role="img"
      aria-label={`Répartition : ${total} tâches actives. Détail ci-dessous.`}
    >
      <circle
        cx="100"
        cy="100"
        r="75"
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth="25"
      />
      {Object.entries(counts).map(([q, n]) => {
        const size = total ? (n / total) * 100 : 0;
        const start = offset;
        offset += size;
        return (
          <circle
            key={q}
            cx="100"
            cy="100"
            r="75"
            pathLength="100"
            fill="none"
            stroke={`var(--${q.toLowerCase()}-accent)`}
            strokeWidth="25"
            strokeDasharray={`${size} ${100 - size}`}
            strokeDashoffset={-start}
            transform="rotate(-90 100 100)"
          />
        );
      })}
      <text
        x="100"
        y="100"
        textAnchor="middle"
        fill="var(--fg)"
        fontSize="28"
        fontWeight="700"
      >
        {total}
      </text>
      <text
        x="100"
        y="123"
        textAnchor="middle"
        fill="var(--muted)"
        fontSize="12"
      >
        tâches actives
      </text>
    </svg>
  );
}
