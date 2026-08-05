import { useState } from "react";

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = 28;

export default function DashboardChart({ data, metricLabel = "등록 수", unit = "개" }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const stepX = (WIDTH - PADDING * 2) / (data.length - 1);

  const pointX = (i) => PADDING + i * stepX;
  const pointY = (v) => HEIGHT - PADDING - (v / maxValue) * (HEIGHT - PADDING * 2);

  const linePoints = data.map((d, i) => `${pointX(i)},${pointY(d.value)}`).join(" ");
  const areaPoints = `${PADDING},${HEIGHT - PADDING} ${linePoints} ${WIDTH - PADDING},${HEIGHT - PADDING}`;

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const x = ratio * WIDTH;
    const index = Math.round((x - PADDING) / stepX);
    setHoverIndex(Math.min(Math.max(index, 0), data.length - 1));
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div className="dashboard-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="dashboard-chart-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <polygon points={areaPoints} fill="url(#chartGradient)" />
        <polyline points={linePoints} fill="none" stroke="#eab54f" strokeWidth="2" />
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eab54f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#eab54f" stopOpacity="0" />
          </linearGradient>
        </defs>

        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={pointX(i)}
            cy={pointY(d.value)}
            r={i === hoverIndex ? 5 : 3}
            fill="#eab54f"
          />
        ))}

        {hoverIndex !== null && (
          <line
            x1={pointX(hoverIndex)}
            x2={pointX(hoverIndex)}
            y1={PADDING}
            y2={HEIGHT - PADDING}
            stroke="#eadfc9"
            strokeDasharray="4 4"
          />
        )}
      </svg>

      {hovered && (
        <div
          className="dashboard-chart-tooltip"
          style={{ left: `${(pointX(hoverIndex) / WIDTH) * 100}%` }}
        >
          <p>{hovered.label}</p>
          <strong>{metricLabel} {hovered.value}{unit}</strong>
        </div>
      )}

      <div className="dashboard-chart-axis">
        {data
          .filter((_, i) => i % 3 === 0)
          .map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
      </div>
    </div>
  );
}
