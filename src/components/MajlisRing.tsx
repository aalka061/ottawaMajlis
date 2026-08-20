type Props = {
  /** How many people sit in the circle. Drawn as one mark each. */
  capacity: number;
  /** Word set at the centre of the circle, where the teacher sits. */
  centre?: string;
  size?: number;
};

/**
 * The majlis drawn as what it is: a circle of places. It shows the size of
 * the group, never who has registered — those numbers stay in the admin
 * register.
 */
export function MajlisRing({ capacity, centre = "مجلس", size = 340 }: Props) {
  const seats = Math.max(capacity, 1);
  const centreXY = size / 2;
  const radius = size / 2 - 22;
  const spacing = (2 * Math.PI * radius) / seats;
  const dot = Math.max(2.5, Math.min(8, spacing / 2 - 1.3));

  const points = Array.from({ length: seats }, (_, i) => {
    const angle = (i / seats) * 2 * Math.PI - Math.PI / 2;
    return {
      x: centreXY + radius * Math.cos(angle),
      y: centreXY + radius * Math.sin(angle),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={`A circle of ${seats} places`}
      className="max-w-[340px]"
    >
      {points.map((p, i) => (
        <circle
          key={i}
          className="seat"
          style={{ animationDelay: `${100 + i * 16}ms` }}
          cx={p.x}
          cy={p.y}
          r={dot}
          fill="var(--color-paper)"
          stroke="var(--color-brass)"
          strokeWidth="1.5"
        />
      ))}
      <text
        x={centreXY}
        y={centreXY}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontSize={size * 0.13}
        fill="var(--color-slate)"
        opacity="0.4"
      >
        {centre}
      </text>
    </svg>
  );
}
