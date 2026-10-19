import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../types/finance';
import { Activity, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

export interface CashFlowPoint {
  date: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface CashFlowTrendChartProps {
  data: CashFlowPoint[];
  currencySymbol?: string;
  title?: string;
}

export const CashFlowTrendChart: React.FC<CashFlowTrendChartProps> = ({
  data,
  currencySymbol = '₱',
  title = 'Cash Flow Trend Line',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Chronologically sort data ascending
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data]);

  // Dimensions for expansive full-width display
  const svgWidth = 1000;
  const svgHeight = 240;
  const paddingX = 55;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Min and max net values for Y scale
  const { minVal, maxVal, hasData } = useMemo(() => {
    if (sortedData.length === 0) {
      return { minVal: -10000, maxVal: 50000, hasData: false };
    }
    const values = sortedData.map((d) => d.net);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1000);
    // Add 10% breathing room
    const range = Math.max(max - min, 1000);
    return {
      minVal: min - range * 0.1,
      maxVal: max + range * 0.1,
      hasData: true,
    };
  }, [sortedData]);

  // Zero Y position
  const zeroY = useMemo(() => {
    const range = maxVal - minVal;
    if (range <= 0) return paddingTop + chartHeight / 2;
    const ratio = (maxVal - 0) / range;
    return paddingTop + ratio * chartHeight;
  }, [minVal, maxVal, chartHeight, paddingTop]);

  // Compute point coordinates
  const points = useMemo(() => {
    if (sortedData.length === 0) return [];
    const count = sortedData.length;
    const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth / 2;
    const range = maxVal - minVal;

    return sortedData.map((d, i) => {
      const x = count > 1 ? paddingX + i * stepX : paddingX + chartWidth / 2;
      const ratio = range > 0 ? (maxVal - d.net) / range : 0.5;
      const y = paddingTop + ratio * chartHeight;
      return { ...d, x, y };
    });
  }, [sortedData, chartWidth, chartHeight, minVal, maxVal, paddingX, paddingTop]);

  // Construct SVG Path
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    // Smooth Bezier or Polyline
    return points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cpX = (prev.x + curr.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [points]);

  // Construct Area Path (filled to zeroY)
  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${zeroY} L ${first.x} ${zeroY} Z`;
  }, [linePath, points, zeroY]);

  // Net Cash Flow total in active series
  const totalNet = useMemo(() => {
    return sortedData.reduce((sum, d) => sum + d.net, 0);
  }, [sortedData]);

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="bg-white border border-neutral-300 rounded shadow-xs p-4 flex flex-col justify-between select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
              {title}
            </h3>
            <p className="text-[10px] text-neutral-400 font-mono">
              Trajectory of net cash flow across recorded timeline
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-neutral-400 block font-mono uppercase">Cumulative Net</span>
          <span
            className={`font-mono font-bold text-xs ${
              totalNet >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {totalNet >= 0 ? '+' : ''}
            {formatCurrency(totalNet, currencySymbol)}
          </span>
        </div>
      </div>

      {/* Interactive SVG Chart Canvas */}
      {!hasData || points.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-neutral-400 text-xs italic">
          No cash flow data available in this window.
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-56"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="cashflowAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Zero Axis Reference Line */}
            <line
              x1={paddingX}
              y1={zeroY}
              x2={svgWidth - paddingX}
              y2={zeroY}
              stroke="#94a3b8"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
            <text
              x={paddingX - 6}
              y={zeroY + 3}
              textAnchor="end"
              fill="#64748b"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
            >
              0
            </text>

            {/* Area Fill */}
            {areaPath && <path d={areaPath} fill="url(#cashflowAreaGradient)" />}

            {/* Main Trend Line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points */}
            {points.map((pt, idx) => {
              const isHovered = hoveredIdx === idx;
              const isPositive = pt.net >= 0;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="cursor-pointer transition-transform"
                >
                  {/* Invisible Hit Target */}
                  <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                  {/* Outer glow on hover */}
                  {isHovered && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={9}
                      fill={isPositive ? '#10b981' : '#ef4444'}
                      opacity={0.3}
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 5.5 : 3.8}
                    fill={isPositive ? '#059669' : '#dc2626'}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2.5 : 1.8}
                  />

                  {/* X Axis Date Label */}
                  {(points.length <= 8 || idx % Math.ceil(points.length / 8) === 0 || idx === points.length - 1) && (
                    <text
                      x={pt.x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontFamily="monospace"
                    >
                      {pt.label.length > 8 ? pt.label.slice(5) : pt.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Active Hover Tooltip Pill */}
          {activePoint && (
            <div className="mt-2 p-2 bg-neutral-900 text-white rounded shadow-md text-xs flex items-center justify-between gap-3 animate-in fade-in duration-100 border border-neutral-700">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-300">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>{activePoint.date}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-emerald-400">
                  In: +{formatCurrency(activePoint.inflow, currencySymbol)}
                </span>
                <span className="text-red-400">
                  Out: -{formatCurrency(activePoint.outflow, currencySymbol)}
                </span>
                <span
                  className={`font-bold font-mono px-1.5 py-0.5 rounded ${
                    activePoint.net >= 0 ? 'bg-emerald-800 text-emerald-100' : 'bg-red-800 text-red-100'
                  }`}
                >
                  Net: {activePoint.net >= 0 ? '+' : ''}
                  {formatCurrency(activePoint.net, currencySymbol)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
