import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../types/finance';
import { BarChart2, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

export interface ComparativePeriodData {
  periodName: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface ComparativeIncomeExpensesChartProps {
  data: ComparativePeriodData[];
  currencySymbol?: string;
  title?: string;
}

export const ComparativeIncomeExpensesChart: React.FC<ComparativeIncomeExpensesChartProps> = ({
  data,
  currencySymbol = '₱',
  title = 'Comparative Income vs. Expenses',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Take the most recent periods (e.g. up to 8 periods so bars are clear and readable)
  const displayData = useMemo(() => {
    return data.slice(0, 8);
  }, [data]);

  // Max value across both inflows and outflows to scale the bars
  const maxBarValue = useMemo(() => {
    if (displayData.length === 0) return 50000;
    const allAmounts = displayData.flatMap((d) => [d.inflow, d.outflow]);
    return Math.max(...allAmounts, 1000);
  }, [displayData]);

  const totalInflow = useMemo(() => {
    return displayData.reduce((s, d) => s + d.inflow, 0);
  }, [displayData]);

  const totalOutflow = useMemo(() => {
    return displayData.reduce((s, d) => s + d.outflow, 0);
  }, [displayData]);

  return (
    <div className="bg-white dark:bg-[#1e2324] border border-neutral-300 dark:border-neutral-700 rounded shadow-xs p-4 flex flex-col justify-between select-none transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 mb-3 border-b border-neutral-200 dark:border-neutral-700/80 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-800 dark:text-neutral-100">
              {title}
            </h3>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-400 font-mono">
              Direct comparison of gross inflows against outflows
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600"></span>
            <span className="text-neutral-700 dark:text-neutral-300">Inflows</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-red-600"></span>
            <span className="text-neutral-700 dark:text-neutral-300">Outflows</span>
          </div>
        </div>
      </div>

      {/* Visual Bar Comparison Grid */}
      {displayData.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-neutral-400 dark:text-neutral-500 text-xs italic">
          No comparison data available for this range.
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {displayData.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            const inflowPct = Math.min(100, Math.max(0, (item.inflow / maxBarValue) * 100));
            const outflowPct = Math.min(100, Math.max(0, (item.outflow / maxBarValue) * 100));
            const isNetPositive = item.net >= 0;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`p-2 rounded border transition cursor-default ${
                  isHovered
                    ? 'bg-neutral-50/90 dark:bg-neutral-800 border-neutral-400 dark:border-neutral-600 shadow-2xs'
                    : 'bg-white dark:bg-neutral-900/60 border-neutral-100 dark:border-neutral-800'
                }`}
              >
                {/* Period Row Header with Net Cash Flow */}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[170px]" title={item.periodName}>
                    {item.periodName}
                  </span>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5 ${
                        isNetPositive
                          ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      {isNetPositive ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-red-700 dark:text-red-400" />
                      )}
                      <span>
                        {isNetPositive ? '+' : ''}
                        {formatCurrency(item.net, currencySymbol)}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Dual Bars Container */}
                <div className="space-y-1 text-[10px]">
                  {/* Inflow Bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-neutral-500 dark:text-neutral-400 font-mono text-[9px] uppercase">Inflow</span>
                    <div className="flex-1 h-3 bg-neutral-100 dark:bg-neutral-800 rounded-none overflow-hidden flex border border-neutral-200 dark:border-neutral-700">
                      <div
                        className="h-full bg-emerald-600 transition-all duration-300 rounded-none"
                        style={{ width: `${inflowPct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                      +{formatCurrency(item.inflow, currencySymbol)}
                    </span>
                  </div>

                  {/* Outflow Bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-neutral-500 dark:text-neutral-400 font-mono text-[9px] uppercase">Outflow</span>
                    <div className="flex-1 h-3 bg-neutral-100 dark:bg-neutral-800 rounded-none overflow-hidden flex border border-neutral-200 dark:border-neutral-700">
                      <div
                        className="h-full bg-red-600 transition-all duration-300 rounded-none"
                        style={{ width: `${outflowPct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-mono font-bold text-red-700 dark:text-red-400 text-[11px]">
                      -{formatCurrency(item.outflow, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aggregate Footer */}
      <div className="mt-3 pt-2.5 border-t border-neutral-200 dark:border-neutral-700/80 flex items-center justify-between text-xs font-mono">
        <div className="text-neutral-500 dark:text-neutral-400">
          Total In: <span className="font-bold text-emerald-700 dark:text-emerald-400">+{formatCurrency(totalInflow, currencySymbol)}</span>
        </div>
        <div className="text-neutral-500 dark:text-neutral-400">
          Total Out: <span className="font-bold text-red-700 dark:text-red-400">-{formatCurrency(totalOutflow, currencySymbol)}</span>
        </div>
      </div>
    </div>
  );
};
