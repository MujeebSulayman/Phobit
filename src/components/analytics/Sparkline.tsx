export function Sparkline({ values, height = 72, className = "" }: { values: number[]; height?: number; className?: string }) {
  const max = Math.max(1, ...values);
  const n = Math.max(2, values.length);
  const line = (values.length ? values : [0, 0])
    .map((v, i) => [(i / (n - 1)) * 400, height - 4 - (v / max) * (height - 12)])
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L400,${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 400 ${height}`} preserveAspectRatio="none" className={`block w-full ${className}`} style={{ height }}>
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.18" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={line} fill="none" stroke="white" strokeOpacity="0.7" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
