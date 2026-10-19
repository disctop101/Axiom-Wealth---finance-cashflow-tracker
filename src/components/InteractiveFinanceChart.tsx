import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../types/finance';
import { getCategoryColor } from '../services/categoryColors';
import {
  PieChart as PieIcon,
  BarChart2,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowDownAZ,
  HelpCircle,
} from 'lucide-react';

export interface ChartSliceData {
  category: string;
  amount: number;
  color?: string;
  count?: number;
}

interface InteractiveFinanceChartProps {
  title: string;
  data: ChartSliceData[];
  total: number;
  currencySymbol: string;
  type: 'income' | 'expense' | 'asset' | 'liability';
  defaultStyle?: 'donut' | 'bar';
  allowStyleToggle?: boolean;
  allowSort?: boolean;
  onSelectCategory?: (category: string) => void;
}

const DEFAULT_PALETTE = [
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Emerald
  '#64748b', // Slate
  '#84cc16', // Lime
  '#06b6d4', // Cyan
];

export const InteractiveFinanceChart: React.FC<InteractiveFinanceChartProps> = ({
  title,
  data,
  total,
  currencySymbol,
  type,
  defaultStyle = 'donut',
  allowStyleToggle = true,
  allowSort = true,
  onSelectCategory,
}) => {
  // Chart visual style: 'donut' (pie) vs 'bar' (bar graph)
  const [chartStyle, setChartStyle] = useState<'donut' | 'bar'>(defaultStyle);

  // Sync state whenever parent changes defaultStyle prop
  React.useEffect(() => {
    setChartStyle(defaultStyle);
  }, [defaultStyle]);

  // Sorting mode: highest amount ('desc'), lowest amount ('asc'), or alphabetical ('alpha')
  const [sortBy, setSortBy] = useState<'desc' | 'asc' | 'alpha'>('desc');

  // Hover state for interactive highlights
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Process & Sort Slices
  const processedSlices = useMemo(() => {
    const nonZero = data.filter((d) => d.amount > 0);

    const sorted = [...nonZero].sort((a, b) => {
      if (sortBy === 'desc') {
        return b.amount - a.amount;
      }
      if (sortBy === 'asc') {
        return a.amount - b.amount;
      }
      if (sortBy === 'alpha') {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });

    return sorted.map((item, idx) => ({
      ...item,
      color: item.color || getCategoryColor(item.category),
      percent: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  }, [data, total, sortBy]);

  const maxAmount = useMemo(() => {
    return Math.max(1, ...processedSlices.map((s) => s.amount));
  }, [processedSlices]);

  // SVG Donut Calculations
  const radius = 68;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;

  const typeBadgeLabel = () => {
    switch (type) {
      case 'income':
        return 'Inflows';
      case 'expense':
        return 'Outflows';
      case 'asset':
        return 'Holdings';
      case 'liability':
        return 'Debts';
      default:
        return 'Categories';
    }
  };

  const typeBadgeClass = () => {
    switch (type) {
      case 'income':
      case 'asset':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'expense':
      case 'liability':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };

  return (
    <div className="bg-white p-3.5 border border-neutral-300 rounded shadow-xs flex flex-col justify-between select-none">
      {/* Top Header with Interactive Style & Sort Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-200 pb-2 mb-3 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800">
            {title}
          </h3>
          <span
            className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border font-bold ${typeBadgeClass()}`}
          >
            {typeBadgeLabel()}
          </span>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sort Controls */}
          {allowSort && (
            <div className="flex items-center bg-neutral-100 border border-neutral-300 rounded p-0.5 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setSortBy('desc')}
                title="Sort by highest amount"
                className={`p-1 rounded flex items-center gap-1 transition ${
                  sortBy === 'desc'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowDownWideNarrow className="w-3 h-3" />
                <span className="hidden md:inline">Highest</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('asc')}
                title="Sort by lowest amount"
                className={`p-1 rounded flex items-center gap-1 transition ${
                  sortBy === 'asc'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowUpNarrowWide className="w-3 h-3" />
                <span className="hidden md:inline">Lowest</span>
              </button>
              <button
                type="button"
                onClick={() => setSortBy('alpha')}
                title="Sort alphabetically (A-Z)"
                className={`p-1 rounded flex items-center gap-1 transition ${
                  sortBy === 'alpha'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <ArrowDownAZ className="w-3 h-3" />
                <span className="hidden md:inline">A-Z</span>
              </button>
            </div>
          )}

          {/* Visual Style Toggle: Donut vs Bar Graph */}
          {allowStyleToggle && (
            <div className="flex items-center bg-neutral-100 border border-neutral-300 rounded p-0.5 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setChartStyle('donut')}
                title="Donut / Pie Chart View"
                className={`p-1 rounded flex items-center gap-1 transition ${
                  chartStyle === 'donut'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <PieIcon className="w-3 h-3" />
                <span className="hidden sm:inline">Donut</span>
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('bar')}
                title="Standard Bar Chart View"
                className={`p-1 rounded flex items-center gap-1 transition ${
                  chartStyle === 'bar'
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <BarChart2 className="w-3 h-3" />
                <span className="hidden sm:inline">Bar Chart</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      {processedSlices.length === 0 || total === 0 ? (
        <div className="h-48 flex flex-col items-center justify-center text-xs text-neutral-400 italic gap-1">
          <HelpCircle className="w-5 h-5 text-neutral-300" />
          <span>No recorded {type} entries in this active period window.</span>
        </div>
      ) : chartStyle === 'donut' ? (
        /* ================= 1. DONUT / PIE CHART VIEW ================= */
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* SVG Donut Circle */}
          <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform">
              <circle
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />

              {processedSlices.map((slice) => {
                const strokeDasharray = `${(slice.percent / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((cumulativePercent / 100) * circumference);
                cumulativePercent += slice.percent;

                const isHovered = hoveredCategory === slice.category;

                return (
                  <circle
                    key={slice.category}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(slice.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    onClick={() => onSelectCategory && onSelectCategory(slice.category)}
                  />
                );
              })}
            </svg>

            {/* Donut Center Summary */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
              <span className="text-[10px] text-neutral-500 uppercase font-medium truncate max-w-[100px]">
                {hoveredCategory || 'Total'}
              </span>
              <span
                className={`text-xs font-bold font-mono ${
                  type === 'income' || type === 'asset' ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {hoveredCategory
                  ? formatCurrency(
                      processedSlices.find((s) => s.category === hoveredCategory)?.amount || 0,
                      currencySymbol
                    )
                  : formatCurrency(total, currencySymbol)}
              </span>
              {hoveredCategory && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  {processedSlices
                    .find((s) => s.category === hoveredCategory)
                    ?.percent.toFixed(1)}
                  %
                </span>
              )}
            </div>
          </div>

          {/* Slices Legend Breakdown */}
          <div className="flex-1 w-full space-y-1.5 max-h-48 overflow-y-auto text-xs pr-1">
            {processedSlices.map((slice) => {
              const isHovered = hoveredCategory === slice.category;

              return (
                <div
                  key={slice.category}
                  onMouseEnter={() => setHoveredCategory(slice.category)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={() => onSelectCategory && onSelectCategory(slice.category)}
                  className={`flex items-center justify-between p-1 rounded transition cursor-pointer ${
                    isHovered ? 'bg-neutral-100 font-semibold shadow-xs' : 'hover:bg-neutral-50'
                  }`}
                  title={`Click to filter or drill into ${slice.category}`}
                >
                  <div className="flex items-center gap-2 truncate max-w-[130px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="truncate text-neutral-700">{slice.category}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-neutral-500">{slice.percent.toFixed(1)}%</span>
                    <span className="font-bold text-neutral-900">
                      {formatCurrency(slice.amount, currencySymbol)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= 2. STANDARD BAR CHART VIEW ================= */
        <div className="space-y-2 py-1 max-h-56 overflow-y-auto pr-1">
          {processedSlices.map((slice) => {
            const barWidth = Math.min(100, Math.max(2, (slice.amount / maxAmount) * 100));
            const isHovered = hoveredCategory === slice.category;

            return (
              <div
                key={slice.category}
                onMouseEnter={() => setHoveredCategory(slice.category)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={() => onSelectCategory && onSelectCategory(slice.category)}
                className={`p-1.5 rounded transition cursor-pointer ${
                  isHovered ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                }`}
                title={`Click to filter or drill into ${slice.category}`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="font-medium text-neutral-800 truncate">{slice.category}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-neutral-500">{slice.percent.toFixed(1)}%</span>
                    <span className="font-bold text-neutral-900">
                      {formatCurrency(slice.amount, currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* Bar Track */}
                <div className="h-3.5 bg-neutral-100 rounded-xs overflow-hidden border border-neutral-200">
                  <div
                    className="h-full transition-all duration-300 rounded-xs"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: slice.color,
                      opacity: isHovered ? 1 : 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
