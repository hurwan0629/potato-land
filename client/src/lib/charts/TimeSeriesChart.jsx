import { useId, useMemo } from "react";

function toDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value ?? "");
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function normalizeItems(items) {
  return (items ?? []).map((item) => ({
    label: toDateLabel(item.period),
    value: Number(item.count ?? 0),
    period: item.period,
  }));
}

/** 관리자 통계에서 재사용하는 의존성 없는 반응형 SVG 시계열 차트. */
export function TimeSeriesChart({
  title,
  description,
  items,
  variant = "line",
  valueSuffix = "건",
}) {
  const titleId = useId();
  const data = useMemo(() => normalizeItems(items), [items]);
  const maxValue = Math.max(1, ...data.map((item) => item.value));

  if (data.length === 0) {
    return (
      <article className="content-card time-series-card">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
        <div className="time-series-chart__empty">집계 데이터가 없습니다.</div>
      </article>
    );
  }

  const width = 640;
  const height = 280;
  const padding = { top: 28, right: 24, bottom: 52, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth;
  const barWidth = Math.max(12, Math.min(42, plotWidth / data.length - 10));
  const points = data.map((item, index) => ({
    ...item,
    x: data.length === 1
      ? padding.left + plotWidth / 2
      : padding.left + index * stepX,
    y: padding.top + plotHeight - (item.value / maxValue) * plotHeight,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const gridValues = [0, 0.25, 0.5, 0.75, 1];

  return (
    <article className="content-card time-series-card">
      <header className="time-series-card__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <strong>{data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}{valueSuffix}</strong>
      </header>

      <div className="time-series-chart" role="img" aria-labelledby={titleId}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          {gridValues.map((ratio) => {
            const y = padding.top + plotHeight - ratio * plotHeight;
            return (
              <g key={ratio}>
                <line className="time-series-chart__grid" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                <text className="time-series-chart__axis" x={padding.left - 10} y={y + 4} textAnchor="end">
                  {Math.round(maxValue * ratio)}
                </text>
              </g>
            );
          })}

          {variant === "bar" ? points.map((point) => (
            <g key={`${point.period}-${point.x}`}>
              <rect
                className="time-series-chart__bar"
                x={point.x - barWidth / 2}
                y={point.y}
                width={barWidth}
                height={padding.top + plotHeight - point.y}
                rx="6"
              >
                <title>{point.label}: {point.value}{valueSuffix}</title>
              </rect>
            </g>
          )) : (
            <>
              <polyline className="time-series-chart__line" points={polyline} />
              {points.map((point) => (
                <circle key={`${point.period}-${point.x}`} className="time-series-chart__point" cx={point.x} cy={point.y} r="5">
                  <title>{point.label}: {point.value}{valueSuffix}</title>
                </circle>
              ))}
            </>
          )}

          {points.map((point, index) => {
            const showLabel = data.length <= 8 || index === 0 || index === data.length - 1 || index % 2 === 0;
            return showLabel ? (
              <text
                key={`label-${point.period}-${point.x}`}
                className="time-series-chart__axis"
                x={point.x}
                y={height - 20}
                textAnchor="middle"
              >
                {point.label}
              </text>
            ) : null;
          })}
        </svg>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead><tr><th>기간</th><th>값</th></tr></thead>
        <tbody>
          {data.map((item) => (
            <tr key={String(item.period)}><td>{item.label}</td><td>{item.value}{valueSuffix}</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
