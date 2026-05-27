"use client";

import { useState } from "react";

export interface LineChartPoint {
  date: string; // "YYYY-MM-DD"
  count: number;
}

/**
 * 자체 SVG 라인 차트 — 외부 dep 0.
 * Plausible 스타일: 미니멀, area fill, hover tooltip.
 */
export default function MiniLineChart({
  data,
  height = 220,
  accent = "#3182F6",
}: {
  data: LineChartPoint[];
  height?: number;
  accent?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const padL = 36;
  const padR = 16;
  const padT = 20;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-sm text-mute">데이터 없음</p>
      </div>
    );
  }

  const maxRaw = Math.max(1, ...data.map((d) => d.count));
  // y축 max는 maxRaw를 살짝 위로 (round to nice)
  const max = niceCeil(maxRaw);
  const step = innerW / Math.max(1, data.length - 1);

  const points = data.map((d, i) => ({
    x: padL + i * step,
    y: padT + innerH - (d.count / max) * innerH,
    date: d.date,
    count: d.count,
  }));

  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${padT + innerH} L ${points[0].x} ${padT + innerH} Z`;

  // x축 라벨 — 첫/중간/마지막만
  const labelIndices: number[] = [];
  if (points.length > 1) {
    labelIndices.push(0);
    if (points.length > 4) labelIndices.push(Math.floor(points.length / 2));
    labelIndices.push(points.length - 1);
  } else {
    labelIndices.push(0);
  }

  // y축 grid 라인 (4개)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    y: padT + innerH * (1 - r),
    label: Math.round(max * r),
  }));

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: H }}>
        <defs>
          <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* y grid */}
        {gridLines.map((g) => (
          <g key={`g-${g.y}`}>
            <line
              x1={padL}
              x2={W - padR}
              y1={g.y}
              y2={g.y}
              stroke="#E5E8EB"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <text
              x={padL - 6}
              y={g.y + 3}
              textAnchor="end"
              fontSize="10"
              fill="#8B95A1"
              fontWeight="600"
            >
              {fmtY(g.label)}
            </text>
          </g>
        ))}

        {/* area + line */}
        <path d={areaPath} fill="url(#lineFill)" />
        <path d={linePath} fill="none" stroke={accent} strokeWidth="2" />

        {/* points */}
        {points.map((p, i) => (
          <g
            key={`p-${i}`}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={p.x - step / 2}
              y={padT}
              width={step}
              height={innerH}
              fill="transparent"
            />
            <circle
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 3}
              fill={accent}
              stroke="white"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* x labels */}
        {labelIndices.map((idx) => (
          <text
            key={`xl-${idx}`}
            x={points[idx].x}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            fill="#8B95A1"
            fontWeight="600"
          >
            {fmtX(points[idx].date)}
          </text>
        ))}

        {/* tooltip */}
        {hover !== null && (
          <g>
            <line
              x1={points[hover].x}
              x2={points[hover].x}
              y1={padT}
              y2={padT + innerH}
              stroke={accent}
              strokeWidth="1"
              strokeOpacity="0.4"
              strokeDasharray="2 2"
            />
            <foreignObject
              x={Math.max(8, Math.min(W - 130, points[hover].x - 60))}
              y={Math.max(8, points[hover].y - 50)}
              width="120"
              height="50"
            >
              <div
                style={{
                  background: "#191F28",
                  color: "white",
                  padding: "6px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  textAlign: "center",
                  lineHeight: 1.4,
                }}
              >
                <div style={{ opacity: 0.7 }}>{fmtXLong(points[hover].date)}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {points[hover].count} 클릭
                </div>
              </div>
            </foreignObject>
          </g>
        )}
      </svg>
    </div>
  );
}

function niceCeil(n: number): number {
  if (n <= 1) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / pow;
  if (m <= 1) return pow;
  if (m <= 2) return 2 * pow;
  if (m <= 5) return 5 * pow;
  return 10 * pow;
}

function fmtY(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

function fmtX(date: string): string {
  // "2026-05-27" → "5/27"
  const m = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return date;
  return `${parseInt(m[1], 10)}/${parseInt(m[2], 10)}`;
}

function fmtXLong(date: string): string {
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return date;
  return `${m[1]}.${m[2]}.${m[3]}`;
}
