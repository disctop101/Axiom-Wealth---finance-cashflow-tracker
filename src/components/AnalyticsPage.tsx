import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  TransactionItem,
  AssetItem,
  AssetTransaction,
  LiabilityItem,
  formatCurrency,
  MONTH_NAMES,
} from '../types/finance';
import { PerformanceYieldView } from './PerformanceYieldView';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Clock,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Crosshair,
  X,
  Sliders,
  Sparkles,
  BarChart3,
  LineChart,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { Tooltip } from './Tooltip';

interface AnalyticsPageProps {
  transactions: TransactionItem[];
  assets?: AssetItem[];
  assetTransactions?: AssetTransaction[];
  liabilities?: LiabilityItem[];
  currencySymbol: string;
  onOpenHelp?: () => void;
}

type TimeRangePreset = 'day' | 'weekly' | 'monthly' | 'yearly' | 'all';
type ViewMode = 'both' | 'income' | 'expenses' | 'net';
type ChartToolMode = 'brush' | 'pan';

interface AggregatedPoint {
  key: string;
  label: string;
  dateSort: string;
  income: number;
  expenses: number;
  net: number;
  txCount: number;
}

/**
 * Computes current active period start and end dates strictly according to calendar definitions
 */
function getCurrentPeriodDates(preset: TimeRangePreset): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const todayStr = now.toISOString().split('T')[0];

  if (preset === 'day') {
    // Day: Selects today's exact date
    return { start: todayStr, end: todayStr };
  } else if (preset === 'weekly') {
    // Week: Selects the current week's full range (Monday to Sunday)
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0],
    };
  } else if (preset === 'monthly') {
    // Month: Selects from the 1st day to the last day of the current month
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  } else if (preset === 'yearly') {
    // Year: Selects the current calendar year
    return {
      start: `${y}-01-01`,
      end: `${y}-12-31`,
    };
  } else {
    // All Time: Complete unbounded ledger history
    return {
      start: '',
      end: '',
    };
  }
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({
  transactions,
  assets = [],
  assetTransactions = [],
  liabilities = [],
  currencySymbol,
  onOpenHelp,
}) => {
  // Top Horizontal Analytics Tab Navigation: 'trends' (Cash Flow Trends) or 'yield' (Performance & Yield)
  const [analyticsTab, setAnalyticsTab] = useState<'trends' | 'yield'>('trends');

  // Global Time Window Filter & Presets (defaults to current month)
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('both');

  // Initial Range: Defaults to current month full span
  const initialCurrentRange = useMemo(() => getCurrentPeriodDates('monthly'), []);
  const [startDate, setStartDate] = useState<string>(initialCurrentRange.start);
  const [endDate, setEndDate] = useState<string>(initialCurrentRange.end);

  // Advanced Chart Mechanics State
  const [toolMode, setToolMode] = useState<ChartToolMode>('brush');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);
  const [smaPeriod, setSmaPeriod] = useState<number>(3);

  // Brush / Drag-to-select range calculation state
  const [brushState, setBrushState] = useState<{
    isBrushing: boolean;
    startX: number;
    currentX: number;
  } | null>(null);
  const [selectedBrushRange, setSelectedBrushRange] = useState<{
    startIdx: number;
    endIdx: number;
    minX: number;
    maxX: number;
  } | null>(null);

  // Pan dragging state
  const [isPanning, setIsPanning] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialPan, setInitialPan] = useState(0);

  // Hover Crosshair Snapping
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * Switching time filters automatically defaults to the current active period
   */
  const handleSelectTimeRange = (preset: TimeRangePreset) => {
    setTimeRange(preset);
    const nextRange = getCurrentPeriodDates(preset);
    setStartDate(nextRange.start);
    setEndDate(nextRange.end);
    // Reset zoom and brush on period switch
    setZoomLevel(1);
    setPanOffset(0);
    setSelectedBrushRange(null);
  };

  /**
   * 'Current' Button: dynamically jumps to present period based on active filter
   */
  const handleJumpToCurrent = () => {
    const nextRange = getCurrentPeriodDates(timeRange);
    setStartDate(nextRange.start);
    setEndDate(nextRange.end);
    setZoomLevel(1);
    setPanOffset(0);
    setSelectedBrushRange(null);
  };

  // Filter transactions strictly falling within [startDate, endDate]
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  // Aggregate points based on timeRange:
  // - Day: Plot by Day / chronological transaction progress
  // - Weekly: Plot X-axis data points by Day
  // - Monthly: Plot X-axis data points by Week
  // - Yearly: Plot X-axis data points by Month
  const chartData = useMemo<AggregatedPoint[]>(() => {
    if (timeRange === 'day') {
      const dateKey = startDate || new Date().toISOString().split('T')[0];
      const dayTxs = filteredTransactions.filter((t) => t.date === dateKey);

      if (dayTxs.length > 1) {
        let runningNet = 0;
        return dayTxs.map((t, idx) => {
          runningNet += t.type === 'income' ? t.amount : -t.amount;
          return {
            key: `tx-${idx}`,
            label: `${t.name.slice(0, 14)} (#${idx + 1})`,
            dateSort: `${dateKey}-${idx}`,
            income: t.type === 'income' ? t.amount : 0,
            expenses: t.type === 'expense' ? t.amount : 0,
            net: runningNet,
            txCount: 1,
          };
        });
      }

      const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

      return [
        {
          key: 'start',
          label: `${dateKey} (00:00)`,
          dateSort: `${dateKey}-00`,
          income: 0,
          expenses: 0,
          net: 0,
          txCount: 0,
        },
        {
          key: 'end',
          label: `${dateKey} (End of Day)`,
          dateSort: `${dateKey}-24`,
          income,
          expenses,
          net: income - expenses,
          txCount: dayTxs.length,
        },
      ];
    } else if (timeRange === 'weekly') {
      // Divide by Day across the week window
      const points: AggregatedPoint[] = [];
      const startD = new Date((startDate || initialCurrentRange.start) + 'T00:00:00');
      const endD = new Date((endDate || initialCurrentRange.end) + 'T00:00:00');
      const actualStart = startD <= endD ? startD : endD;
      const actualEnd = startD <= endD ? endD : startD;

      const curr = new Date(actualStart);
      const maxDays = 31;
      let count = 0;

      while (curr <= actualEnd && count < maxDays) {
        const yStr = curr.getFullYear();
        const mStr = String(curr.getMonth() + 1).padStart(2, '0');
        const dStr = String(curr.getDate()).padStart(2, '0');
        const dateKey = `${yStr}-${mStr}-${dStr}`;
        const weekday = curr.toLocaleDateString('en-US', { weekday: 'short' });
        const label = `${weekday} ${curr.getDate()}`;

        const dayTxs = filteredTransactions.filter((t) => t.date === dateKey);
        const income = dayTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const expenses = dayTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        points.push({
          key: dateKey,
          label,
          dateSort: dateKey,
          income,
          expenses,
          net: income - expenses,
          txCount: dayTxs.length,
        });

        curr.setDate(curr.getDate() + 1);
        count++;
      }

      return points;
    } else if (timeRange === 'monthly') {
      // Divide by Week across the month window
      const startD = new Date((startDate || initialCurrentRange.start) + 'T00:00:00');
      const endD = new Date((endDate || initialCurrentRange.end) + 'T00:00:00');
      const sameMonth =
        startD.getFullYear() === endD.getFullYear() &&
        startD.getMonth() === endD.getMonth();

      if (sameMonth) {
        const y = startD.getFullYear();
        const m = startD.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        const points: AggregatedPoint[] = [];

        const weekBrackets = [
          { num: 1, startDay: 1, endDay: 7, label: 'Week 1' },
          { num: 2, startDay: 8, endDay: 14, label: 'Week 2' },
          { num: 3, startDay: 15, endDay: 21, label: 'Week 3' },
          { num: 4, startDay: 22, endDay: 28, label: 'Week 4' },
          ...(lastDay > 28 ? [{ num: 5, startDay: 29, endDay: lastDay, label: 'Week 5' }] : []),
        ];

        weekBrackets.forEach((wb) => {
          const wTxs = filteredTransactions.filter((t) => {
            const tDate = new Date(t.date + 'T00:00:00');
            const dayNum = tDate.getDate();
            return dayNum >= wb.startDay && dayNum <= wb.endDay;
          });

          const income = wTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const expenses = wTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

          points.push({
            key: `W${wb.num}`,
            label: wb.label,
            dateSort: `${y}-${String(m + 1).padStart(2, '0')}-W${wb.num}`,
            income,
            expenses,
            net: income - expenses,
            txCount: wTxs.length,
          });
        });

        return points;
      } else {
        // Multi-month range: group by calendar week
        const weekMap: Record<
          string,
          { label: string; dateSort: string; income: number; expenses: number; txCount: number }
        > = {};

        filteredTransactions.forEach((t) => {
          const d = new Date(t.date + 'T00:00:00');
          const startOfYear = new Date(d.getFullYear(), 0, 1);
          const dayOfYear = Math.floor((d.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
          const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
          const key = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

          if (!weekMap[key]) {
            weekMap[key] = {
              label: `Wk ${weekNum}`,
              dateSort: key,
              income: 0,
              expenses: 0,
              txCount: 0,
            };
          }
          if (t.type === 'income') weekMap[key].income += t.amount;
          else weekMap[key].expenses += t.amount;
          weekMap[key].txCount += 1;
        });

        return Object.entries(weekMap)
          .map(([key, data]) => ({
            key,
            label: data.label,
            dateSort: data.dateSort,
            income: data.income,
            expenses: data.expenses,
            net: data.income - data.expenses,
            txCount: data.txCount,
          }))
          .sort((a, b) => a.dateSort.localeCompare(b.dateSort));
      }
    } else {
      // Yearly: Divide by Month (Jan to Dec)
      const startD = new Date((startDate || initialCurrentRange.start) + 'T00:00:00');
      const endD = new Date((endDate || initialCurrentRange.end) + 'T00:00:00');
      const y = startD.getFullYear();
      const sameYear = y === endD.getFullYear();

      if (sameYear) {
        const points: AggregatedPoint[] = [];
        for (let m = 1; m <= 12; m++) {
          const monthKey = `${y}-${String(m).padStart(2, '0')}`;
          const label = MONTH_NAMES[m - 1]?.slice(0, 3) || `M${m}`;
          const mTxs = filteredTransactions.filter((t) => t.date.startsWith(monthKey));

          const income = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const expenses = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

          points.push({
            key: monthKey,
            label,
            dateSort: `${monthKey}-01`,
            income,
            expenses,
            net: income - expenses,
            txCount: mTxs.length,
          });
        }
        return points;
      } else {
        // Multi-year: group by Year-Month
        const monthMap: Record<
          string,
          { label: string; dateSort: string; income: number; expenses: number; txCount: number }
        > = {};

        filteredTransactions.forEach((t) => {
          const d = new Date(t.date + 'T00:00:00');
          const yr = d.getFullYear();
          const m = d.getMonth() + 1;
          const key = `${yr}-${String(m).padStart(2, '0')}`;

          if (!monthMap[key]) {
            const short = MONTH_NAMES[m - 1]?.slice(0, 3) || `M${m}`;
            monthMap[key] = {
              label: `${short} '${String(yr).slice(2)}`,
              dateSort: `${key}-01`,
              income: 0,
              expenses: 0,
              txCount: 0,
            };
          }
          if (t.type === 'income') monthMap[key].income += t.amount;
          else monthMap[key].expenses += t.amount;
          monthMap[key].txCount += 1;
        });

        return Object.entries(monthMap)
          .map(([key, data]) => ({
            key,
            label: data.label,
            dateSort: data.dateSort,
            income: data.income,
            expenses: data.expenses,
            net: data.income - data.expenses,
            txCount: data.txCount,
          }))
          .sort((a, b) => a.dateSort.localeCompare(b.dateSort));
      }
    }
  }, [filteredTransactions, timeRange, startDate, endDate, initialCurrentRange]);

  // Overall window KPI metrics
  const totalWindowIncome = useMemo(
    () => chartData.reduce((sum, d) => sum + d.income, 0),
    [chartData]
  );
  const totalWindowExpenses = useMemo(
    () => chartData.reduce((sum, d) => sum + d.expenses, 0),
    [chartData]
  );
  const netWindowCashflow = totalWindowIncome - totalWindowExpenses;
  const windowSavingsRate =
    totalWindowIncome > 0 ? ((totalWindowIncome - totalWindowExpenses) / totalWindowIncome) * 100 : 0;

  const peakPoint = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((max, d) => (d.income > max.income ? d : max), chartData[0]);
  }, [chartData]);

  const deepestOutflow = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((max, d) => (d.expenses > max.expenses ? d : max), chartData[0]);
  }, [chartData]);

  // Top spending category in active window
  const topExpenseCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return entries.length > 0 ? { name: entries[0][0], amount: entries[0][1] } : null;
  }, [filteredTransactions]);

  // Stock Market Graph Sizing & Scales
  const svgWidth = 920;
  const svgHeight = 340;
  const paddingLeft = 70;
  const paddingRight = 45;
  const paddingTop = 30;
  const paddingBottom = 45;

  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  // Compute Max and Min value for scale (supporting negative Net values)
  const { maxVal, minVal } = useMemo(() => {
    if (chartData.length === 0) return { maxVal: 50000, minVal: 0 };

    let highest = 0;
    let lowest = 0;

    chartData.forEach((d) => {
      if (viewMode === 'income') {
        if (d.income > highest) highest = d.income;
      } else if (viewMode === 'expenses') {
        if (d.expenses > highest) highest = d.expenses;
      } else if (viewMode === 'net') {
        if (d.net > highest) highest = d.net;
        if (d.net < lowest) lowest = d.net;
      } else {
        // both
        if (d.income > highest) highest = d.income;
        if (d.expenses > highest) highest = d.expenses;
        if (d.net < lowest) lowest = d.net;
      }
    });

    const headroom = Math.max(Math.abs(highest) * 0.15, 5000);
    const bottomRoom = Math.max(Math.abs(lowest) * 0.15, 5000);

    return {
      maxVal: Math.max(highest + headroom, 1000),
      minVal: lowest < 0 ? lowest - bottomRoom : 0,
    };
  }, [chartData, viewMode]);

  const valRange = maxVal - minVal || 1;

  // Zero-Baseline Y position
  const zeroY = useMemo(() => {
    if (minVal >= 0) return paddingTop + graphHeight;
    const ratio = (maxVal - 0) / valRange;
    return paddingTop + ratio * graphHeight;
  }, [minVal, maxVal, valRange, graphHeight, paddingTop]);

  // Zoom and Pan effective width and mapping
  const effectiveWidth = graphWidth * zoomLevel;
  const maxPan = Math.max(0, effectiveWidth - graphWidth);
  const clampedPan = Math.max(0, Math.min(panOffset, maxPan));

  // Calculate coordinates for points
  const points = useMemo(() => {
    if (chartData.length === 0) return [];
    const count = chartData.length;

    return chartData.map((d, i) => {
      const stepFraction = count > 1 ? i / (count - 1) : 0.5;
      const x = paddingLeft + stepFraction * effectiveWidth - clampedPan;

      const incomeRatio = Math.max(0, (maxVal - d.income) / valRange);
      const incomeY = paddingTop + incomeRatio * graphHeight;

      const expenseRatio = Math.max(0, (maxVal - d.expenses) / valRange);
      const expenseY = paddingTop + expenseRatio * graphHeight;

      const netRatio = Math.max(0, (maxVal - d.net) / valRange);
      const netY = paddingTop + netRatio * graphHeight;

      return {
        ...d,
        x,
        incomeY,
        expenseY,
        netY,
      };
    });
  }, [chartData, effectiveWidth, clampedPan, graphHeight, maxVal, valRange, paddingLeft, paddingTop]);

  // Moving Average (SMA) Calculation
  const smaPoints = useMemo(() => {
    if (!showMovingAverage || points.length === 0) return [];
    const period = Math.min(smaPeriod, points.length);

    return points.map((p, idx) => {
      const startIdx = Math.max(0, idx - period + 1);
      const slice = points.slice(startIdx, idx + 1);
      const avgVal =
        slice.reduce((sum, item) => {
          const val =
            viewMode === 'income'
              ? item.income
              : viewMode === 'expenses'
              ? item.expenses
              : item.net;
          return sum + val;
        }, 0) / slice.length;

      const ratio = Math.max(0, (maxVal - avgVal) / valRange);
      const y = paddingTop + ratio * graphHeight;
      return { x: p.x, y, avgVal, label: p.label };
    });
  }, [showMovingAverage, smaPeriod, points, viewMode, maxVal, valRange, paddingTop, graphHeight]);

  // SVG Line Path Generators (Smooth Bezier)
  const generatePath = (valKey: 'incomeY' | 'expenseY' | 'netY') => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0][valKey]}`;

    return points.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr[valKey]}`;
      const prev = arr[idx - 1];
      const cpX = (prev.x + curr.x) / 2;
      return `${acc} C ${cpX} ${prev[valKey]}, ${cpX} ${curr[valKey]}, ${curr.x} ${curr[valKey]}`;
    }, '');
  };

  const incomeLine = useMemo(() => generatePath('incomeY'), [points]);
  const expenseLine = useMemo(() => generatePath('expenseY'), [points]);
  const netLine = useMemo(() => generatePath('netY'), [points]);

  // SMA Smooth Line Path
  const smaLinePath = useMemo(() => {
    if (smaPoints.length === 0) return '';
    if (smaPoints.length === 1) return `M ${smaPoints[0].x} ${smaPoints[0].y}`;

    return smaPoints.reduce((acc, curr, idx, arr) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = arr[idx - 1];
      const cpX = (prev.x + curr.x) / 2;
      return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [smaPoints]);

  const baseZeroY = zeroY;

  const incomeArea = useMemo(() => {
    if (points.length < 2 || !incomeLine) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${incomeLine} L ${last.x} ${baseZeroY} L ${first.x} ${baseZeroY} Z`;
  }, [incomeLine, points, baseZeroY]);

  const expenseArea = useMemo(() => {
    if (points.length < 2 || !expenseLine) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${expenseLine} L ${last.x} ${baseZeroY} L ${first.x} ${baseZeroY} Z`;
  }, [expenseLine, points, baseZeroY]);

  // Y Axis Ticks
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i <= count; i++) {
      const val = minVal + (maxVal - minVal) * (i / count);
      const y = paddingTop + (graphHeight - (i / count) * graphHeight);
      ticks.push({ val, y });
    }
    return ticks;
  }, [minVal, maxVal, graphHeight, paddingTop]);

  // Dynamic Range Computation for Brush Tool
  const brushedCalculation = useMemo(() => {
    if (!selectedBrushRange || points.length === 0) return null;
    const slice = points.slice(
      selectedBrushRange.startIdx,
      selectedBrushRange.endIdx + 1
    );
    if (slice.length === 0) return null;

    const totalInflow = slice.reduce((sum, p) => sum + p.income, 0);
    const totalOutflow = slice.reduce((sum, p) => sum + p.expenses, 0);
    const netCashflow = totalInflow - totalOutflow;
    const avgSpend = totalOutflow / slice.length;

    return {
      slice,
      startLabel: slice[0].label,
      endLabel: slice[slice.length - 1].label,
      count: slice.length,
      totalInflow,
      totalOutflow,
      netCashflow,
      avgSpend,
    };
  }, [selectedBrushRange, points]);

  // Convert client mouse or touch coordinates to SVG internal coordinates
  const getSvgCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const rect = svgRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * svgWidth;
      const y = ((clientY - rect.top) / rect.height) * svgHeight;
      return { x, y };
    },
    [svgWidth, svgHeight]
  );

  // Common Pointer Down Logic
  const handlePointerStart = (clientX: number, clientY: number) => {
    const { x, y } = getSvgCoordinates(clientX, clientY);

    if (toolMode === 'brush') {
      if (x >= paddingLeft && x <= paddingLeft + graphWidth) {
        setBrushState({ isBrushing: true, startX: x, currentX: x });
        setSelectedBrushRange(null);
      }
    } else {
      // Pan mode
      setIsPanning(true);
      setDragStartX(clientX);
      setInitialPan(panOffset);
    }
  };

  // Common Pointer Move Logic
  const handlePointerMove = (clientX: number, clientY: number) => {
    const { x, y } = getSvgCoordinates(clientX, clientY);
    setMousePos({ x, y });

    // Handle Active Brush Drag
    if (brushState?.isBrushing) {
      const clampedX = Math.max(paddingLeft, Math.min(paddingLeft + graphWidth, x));
      setBrushState((prev) => (prev ? { ...prev, currentX: clampedX } : null));
      return;
    }

    // Handle Active Pan Drag
    if (isPanning && toolMode === 'pan') {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = (clientX - dragStartX) * (svgWidth / rect.width);
      const nextPan = Math.max(0, Math.min(maxPan, initialPan - dx));
      setPanOffset(nextPan);
      return;
    }

    // Snapping Crosshairs
    if (points.length > 0) {
      let closestIdx = 0;
      let closestDist = Infinity;
      points.forEach((p, idx) => {
        const dist = Math.abs(p.x - x);
        if (dist < closestDist) {
          closestDist = dist;
        }
      });
      setHoveredIndex(closestIdx);
    }
  };

  // Mouse Down: Brush Selection or Pan Drag
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    handlePointerStart(e.clientX, e.clientY);
  };

  // Mouse Move: update brush, pan, or crosshairs
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handlePointerMove(e.clientX, e.clientY);
  };

  // Touch Start: Mobile drag-to-select and pan
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerStart(touch.clientX, touch.clientY);
    }
  };

  // Touch Move: Mobile drag selection and panning with touch event support
  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    }
  };

  // Pointer Up: Commit Brush Range or Stop Pan
  const handlePointerEnd = () => {
    if (brushState?.isBrushing) {
      const minX = Math.min(brushState.startX, brushState.currentX);
      const maxX = Math.max(brushState.startX, brushState.currentX);

      if (maxX - minX >= 15 && points.length > 0) {
        const matchingIndices = points
          .map((p, idx) => ({ p, idx }))
          .filter((item) => item.p.x >= minX - 12 && item.p.x <= maxX + 12);

        if (matchingIndices.length > 0) {
          const startIdx = matchingIndices[0].idx;
          const endIdx = matchingIndices[matchingIndices.length - 1].idx;
          setSelectedBrushRange({
            startIdx,
            endIdx,
            minX,
            maxX,
          });
        }
      }
      setBrushState(null);
    }

    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Mouse Up
  const handleMouseUp = () => {
    handlePointerEnd();
  };

  // Touch End
  const handleTouchEnd = () => {
    handlePointerEnd();
  };

  // Touch Cancel
  const handleTouchCancel = () => {
    handlePointerEnd();
    setHoveredIndex(null);
    setMousePos(null);
  };

  // Mouse Leave: Clear Active States
  const handleMouseLeave = () => {
    if (brushState?.isBrushing) {
      handleMouseUp();
    }
    setIsPanning(false);
    setHoveredIndex(null);
    setMousePos(null);
  };

  // Scroll Wheel Zoom across chart timeline
  const handleWheelZoom = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY;
    setZoomLevel((prev) => {
      const next = delta < 0 ? Math.min(prev * 1.25, 5) : Math.max(prev / 1.25, 1);
      if (next === 1) setPanOffset(0);
      return parseFloat(next.toFixed(2));
    });
  };

  const activeHoverPoint =
    hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="space-y-4 max-w-7xl mx-auto select-none">
      {/* ================= TOP HORIZONTAL ANALYTICS TAB SYSTEM ================= */}
      <div className="bg-[#1e2324] p-1.5 rounded-lg border border-neutral-700 shadow-md flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAnalyticsTab('trends')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
              analyticsTab === 'trends'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>Cash Flow Trends</span>
          </button>

          <button
            type="button"
            onClick={() => setAnalyticsTab('yield')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
              analyticsTab === 'yield'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Performance &amp; Yield</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 pr-2 text-[11px] text-neutral-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time Financial Telemetry</span>
        </div>
      </div>

      {/* ================= PAGE HEADER & TIME CONTROLS ================= */}
      <div className="bg-[#1e2324] text-white p-4 rounded-lg border border-neutral-700 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/80 flex items-center justify-center text-emerald-400">
            {analyticsTab === 'trends' ? (
              <Activity className="w-5 h-5" />
            ) : (
              <BarChart3 className="w-5 h-5" />
            )}
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-wide uppercase text-white">
              {analyticsTab === 'trends' ? 'Advanced Financial Analytics' : 'Asset Performance & Yield Analytics'}
            </h1>
            <p className="text-xs text-neutral-400">
              {analyticsTab === 'trends'
                ? 'Interactive market telemetry, brush isolated scorecards, zero-baseline & trend curves'
                : 'Parent asset class comparative return, invested capital allocation & itemised yield drill-down'}
            </p>
          </div>
        </div>

        {/* Global Controls: Presets + Current Jump + Date Pickers */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Presets (Day, Week, Month, Year, All Time) */}
          <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-700 text-xs">
            {(['day', 'weekly', 'monthly', 'yearly', 'all'] as const).map((r) => {
              const labels = {
                day: 'Day',
                weekly: 'Week',
                monthly: 'Month',
                yearly: 'Year',
                all: 'All Time',
              };
              const isSelected = timeRange === r;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleSelectTimeRange(r)}
                  className={`px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {labels[r]}
                </button>
              );
            })}

            {/* Current Button alongside selector: dynamically jumps to present period */}
            <button
              type="button"
              onClick={handleJumpToCurrent}
              className="flex items-center gap-1 px-3 py-1.5 rounded font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xs transition cursor-pointer ml-0.5"
              title="Jump to present active period (Today / Current Week / Current Month / Current Year)"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Current</span>
            </button>
          </div>

          {/* Date Picker Selection Interface */}
          <div className="flex items-center gap-2 bg-neutral-900/90 px-3 py-1.5 rounded-lg border border-neutral-700 text-xs text-neutral-300">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] text-neutral-400 hidden sm:inline">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-0.5 text-xs font-mono focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              title="Start Date"
            />
            <span className="text-[11px] text-neutral-400 hidden sm:inline">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-neutral-800 text-white border border-neutral-700 rounded px-2 py-0.5 text-xs font-mono focus:outline-hidden focus:border-emerald-500 cursor-pointer"
              title="End Date"
            />
          </div>

          {/* Contextual Guide Button */}
          {onOpenHelp && (
            <Tooltip content="Open operational guide and button explanations for Analytics & Trends" position="bottom">
              <button
                type="button"
                onClick={onOpenHelp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-600 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 shadow-xs"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Guide</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* ================= TAB CONTENT 2: PERFORMANCE & YIELD ================= */}
      {analyticsTab === 'yield' && (
        <PerformanceYieldView
          assets={assets}
          assetTransactions={assetTransactions}
          liabilities={liabilities}
          currencySymbol={currencySymbol}
          startDate={startDate}
          endDate={endDate}
        />
      )}

      {/* ================= TAB CONTENT 1: CASH FLOW TRENDS ================= */}
      {analyticsTab === 'trends' && (
        <div className="space-y-4">

      {/* ================= STOCK TICKER SUMMARY STATS BAR ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Metric 1: Total Period Income */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Total Period Inflow</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
            {formatCurrency(totalWindowIncome, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Peak cycle: {peakPoint ? peakPoint.label : 'N/A'} ({peakPoint ? formatCurrency(peakPoint.income, currencySymbol) : ''})
          </div>
        </div>

        {/* Metric 2: Total Period Outflow */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Total Period Outflow</span>
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-red-400">
            {formatCurrency(totalWindowExpenses > 0 ? -totalWindowExpenses : 0, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Deepest burn: {deepestOutflow ? deepestOutflow.label : 'N/A'} ({deepestOutflow ? formatCurrency(deepestOutflow.expenses, currencySymbol) : ''})
          </div>
        </div>

        {/* Metric 3: Net Cash Delta */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Net Cash Surplus</span>
            {netWindowCashflow >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
            )}
          </div>
          <div
            className={`text-lg sm:text-xl font-bold font-mono ${
              netWindowCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(netWindowCashflow, currencySymbol)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-1">
            Savings Retention: <span className="font-bold text-white">{windowSavingsRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Metric 4: Top Burn Category */}
        <div className="bg-neutral-900 border border-neutral-800 p-3.5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] mb-1">
            <span className="uppercase tracking-wider font-semibold">Top Expense Category</span>
            <PieChart className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white truncate">
            {topExpenseCategory ? topExpenseCategory.name : 'None'}
          </div>
          <div className="text-[10px] text-amber-400/90 font-mono mt-1">
            {topExpenseCategory ? formatCurrency(topExpenseCategory.amount, currencySymbol) : '0'} absorbed
          </div>
        </div>
      </div>

      {/* ================= DYNAMIC BRUSH SELECTION SCORECARD (WHEN BRUSH TOOL IS ACTIVE) ================= */}
      {brushedCalculation && (
        <div className="bg-gradient-to-r from-sky-950 via-neutral-900 to-sky-950 border border-sky-500/70 p-3.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-sky-800/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-sky-500/20 text-sky-400 border border-sky-400/30">
                <Crosshair className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-white">
                    Isolated Brush Range Scorecard
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-mono font-bold">
                    {brushedCalculation.startLabel} &rarr; {brushedCalculation.endLabel} ({brushedCalculation.count} intervals)
                  </span>
                </div>
                <p className="text-[10px] text-sky-200/80">
                  Dynamic calculations strictly isolated to your selected chart drag window
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedBrushRange(null)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-900/60 hover:bg-sky-800 text-sky-200 hover:text-white rounded text-xs font-semibold border border-sky-600 transition cursor-pointer self-start md:self-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Selection</span>
            </button>
          </div>

          {/* 4 Scorecard Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-neutral-900/80 p-2.5 rounded border border-neutral-700/80">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
                Total Inflow
              </span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {formatCurrency(brushedCalculation.totalInflow, currencySymbol)}
              </span>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded border border-neutral-700/80">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
                Total Outflow
              </span>
              <span className="text-base font-bold font-mono text-red-400">
                {formatCurrency(brushedCalculation.totalOutflow > 0 ? -brushedCalculation.totalOutflow : 0, currencySymbol)}
              </span>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded border border-neutral-700/80">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
                Net Cash Flow
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  brushedCalculation.netCashflow >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {brushedCalculation.netCashflow >= 0 ? '+' : ''}
                {formatCurrency(brushedCalculation.netCashflow, currencySymbol)}
              </span>
            </div>

            <div className="bg-neutral-900/80 p-2.5 rounded border border-neutral-700/80">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400 block mb-0.5">
                Average Spend
              </span>
              <span className="text-base font-bold font-mono text-amber-400">
                {formatCurrency(brushedCalculation.avgSpend, currencySymbol)}
                <span className="text-[9px] text-neutral-400 font-sans ml-1">/ interval</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ================= DYNAMIC STOCK-MARKET STYLE LINE GRAPH ================= */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 sm:p-4 shadow-xl overflow-hidden space-y-3">
        {/* Terminal Header & Mode Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-400">
                MARKET TREND VIEW &middot; {timeRange.toUpperCase()} CYCLES
              </span>
              <p className="text-[10px] text-neutral-400 font-mono">
                Interactive crosshairs &middot; zero-baseline &middot; zoom/pan &middot; moving average overlay
              </p>
            </div>
          </div>

          {/* Interactive Tools: Zoom, Pan, Brush, Moving Average, View Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Tool Mode: Brush vs Pan */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setToolMode('brush')}
                className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  toolMode === 'brush'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Brush Tool: Drag across chart to isolate a timeframe and calculate summary scorecards"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Brush</span>
              </button>
              <button
                type="button"
                onClick={() => setToolMode('pan')}
                className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  toolMode === 'pan'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Pan Tool: Click and drag to navigate across timeline"
              >
                <Move className="w-3.5 h-3.5" />
                <span>Pan</span>
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(prev * 1.3, 5))}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-neutral-400 px-1">
                {zoomLevel.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoomLevel((prev) => {
                    const next = Math.max(prev / 1.3, 1);
                    if (next === 1) setPanOffset(0);
                    return next;
                  });
                }}
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              {zoomLevel > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoomLevel(1);
                    setPanOffset(0);
                  }}
                  className="p-1 rounded text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 transition cursor-pointer"
                  title="Reset Zoom (1:1)"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Moving Average Toggle */}
            <button
              type="button"
              onClick={() => setShowMovingAverage((prev) => !prev)}
              className={`px-2.5 py-1 rounded font-semibold transition cursor-pointer text-xs border flex items-center gap-1.5 ${
                showMovingAverage
                  ? 'bg-amber-950/80 border-amber-500/80 text-amber-300 shadow-xs'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
              title="Toggle Simple Moving Average (SMA) trendline overlay to smooth volatility"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>SMA {showMovingAverage ? `(${smaPeriod})` : 'Off'}</span>
            </button>

            {/* View Mode Curve Toggles */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-700 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('both')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'both'
                    ? 'bg-neutral-700 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Both</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('income')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'income'
                    ? 'bg-emerald-950 border border-emerald-600 text-emerald-300 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Inflow</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('expenses')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'expenses'
                    ? 'bg-red-950 border border-red-600 text-red-300 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Outflow</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('net')}
                className={`px-2 py-1 rounded font-semibold transition cursor-pointer flex items-center gap-1 ${
                  viewMode === 'net'
                    ? 'bg-sky-950 border border-sky-600 text-sky-300 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>Net Flow</span>
              </button>
            </div>
          </div>
        </div>

        {/* SVG Stock Chart Container */}
        <div className="relative w-full overflow-hidden select-none">
          {chartData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-neutral-500 text-xs italic">
              <Activity className="w-8 h-8 opacity-40 mb-2" />
              No financial entries found in this timeframe. Log transactions to view market curves.
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className={`w-full h-auto min-w-[650px] overflow-visible ${
                toolMode === 'pan' ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-crosshair'
              }`}
              style={{ touchAction: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              onWheel={handleWheelZoom}
            >
              <defs>
                {/* Glow Filter for Stock Lines */}
                <filter id="glow-income" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.7" />
                </filter>
                <filter id="glow-expense" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.7" />
                </filter>
                <filter id="glow-net" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#38bdf8" floodOpacity="0.7" />
                </filter>
                <filter id="glow-sma" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.8" />
                </filter>

                {/* Area Gradient Fills */}
                <linearGradient id="grad-income" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="grad-expense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>

                {/* Positive and Negative Territory Gradients for Zero-Baseline */}
                <linearGradient id="grad-positive-territory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="grad-negative-territory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.02" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.09" />
                </linearGradient>

                {/* Graph Bounds Clipping for Pan/Zoom */}
                <clipPath id="chart-clip-area">
                  <rect
                    x={paddingLeft}
                    y={paddingTop}
                    width={graphWidth}
                    height={graphHeight}
                  />
                </clipPath>
              </defs>

              {/* Zero-Baseline Marker Territories (Positive above, Negative below) */}
              <rect
                x={paddingLeft}
                y={paddingTop}
                width={graphWidth}
                height={Math.max(0, zeroY - paddingTop)}
                fill="url(#grad-positive-territory)"
                pointerEvents="none"
              />
              <rect
                x={paddingLeft}
                y={zeroY}
                width={graphWidth}
                height={Math.max(0, paddingTop + graphHeight - zeroY)}
                fill="url(#grad-negative-territory)"
                pointerEvents="none"
              />

              {/* Grid Lines & Y Axis Labels */}
              {yTicks.map((t, idx) => (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={t.y}
                    x2={paddingLeft + graphWidth}
                    y2={t.y}
                    stroke="#262b2f"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={t.y + 4}
                    textAnchor="end"
                    fill="#6b7280"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatCurrency(t.val, currencySymbol)}
                  </text>
                </g>
              ))}

              {/* Zero-Baseline Marker Line: Visually separates positive net flow from negative territory */}
              <line
                x1={paddingLeft}
                y1={zeroY}
                x2={paddingLeft + graphWidth}
                y2={zeroY}
                stroke="#38bdf8"
                strokeWidth="1.75"
                strokeDasharray="5 3"
              />
              <g transform={`translate(${paddingLeft - 58}, ${zeroY - 7.5})`}>
                <rect width="52" height="15" rx="3" fill="#0369a1" fillOpacity="0.85" stroke="#38bdf8" strokeWidth="1" />
                <text x="26" y="10.5" textAnchor="middle" fill="#e0f2fe" fontSize="8" fontWeight="bold" fontFamily="monospace">
                  0 BASELINE
                </text>
              </g>

              {/* Clipped Chart Content (Lines, Area, Nodes) for clean zoom and pan */}
              <g clipPath="url(#chart-clip-area)">
                {/* Area Fills */}
                {(viewMode === 'both' || viewMode === 'income') && incomeArea && (
                  <path d={incomeArea} fill="url(#grad-income)" />
                )}
                {(viewMode === 'both' || viewMode === 'expenses') && expenseArea && (
                  <path d={expenseArea} fill="url(#grad-expense)" />
                )}

                {/* Income Line */}
                {(viewMode === 'both' || viewMode === 'income') && incomeLine && (
                  <path
                    d={incomeLine}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    filter="url(#glow-income)"
                    strokeLinecap="round"
                  />
                )}

                {/* Expense Line */}
                {(viewMode === 'both' || viewMode === 'expenses') && expenseLine && (
                  <path
                    d={expenseLine}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    filter="url(#glow-expense)"
                    strokeLinecap="round"
                  />
                )}

                {/* Net Cash Flow Line (When Net Mode is selected) */}
                {viewMode === 'net' && netLine && (
                  <path
                    d={netLine}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.75"
                    filter="url(#glow-net)"
                    strokeLinecap="round"
                  />
                )}

                {/* Moving Average (SMA) Overlay Line */}
                {showMovingAverage && smaLinePath && (
                  <path
                    d={smaLinePath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.25"
                    strokeDasharray="6 3"
                    filter="url(#glow-sma)"
                    strokeLinecap="round"
                  />
                )}

                {/* Point Nodes */}
                {points.map((p, idx) => {
                  const isHovered = hoveredIndex === idx;

                  return (
                    <g key={idx}>
                      {/* Income Node */}
                      {(viewMode === 'both' || viewMode === 'income') && (
                        <circle
                          cx={p.x}
                          cy={p.incomeY}
                          r={isHovered ? 5.5 : 3}
                          fill="#10b981"
                          stroke="#0f172a"
                          strokeWidth="2"
                          pointerEvents="none"
                          className="transition-all duration-75"
                        />
                      )}

                      {/* Expense Node */}
                      {(viewMode === 'both' || viewMode === 'expenses') && (
                        <circle
                          cx={p.x}
                          cy={p.expenseY}
                          r={isHovered ? 5.5 : 3}
                          fill="#ef4444"
                          stroke="#0f172a"
                          strokeWidth="2"
                          pointerEvents="none"
                          className="transition-all duration-75"
                        />
                      )}

                      {/* Net Node */}
                      {viewMode === 'net' && (
                        <circle
                          cx={p.x}
                          cy={p.netY}
                          r={isHovered ? 6 : 3.5}
                          fill={p.net >= 0 ? '#10b981' : '#ef4444'}
                          stroke="#0f172a"
                          strokeWidth="2"
                          pointerEvents="none"
                          className="transition-all duration-75"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Active Brush Selection Box (when dragging or locked) */}
                {brushState?.isBrushing && (
                  <rect
                    x={Math.min(brushState.startX, brushState.currentX)}
                    y={paddingTop}
                    width={Math.abs(brushState.currentX - brushState.startX)}
                    height={graphHeight}
                    fill="#38bdf8"
                    fillOpacity="0.22"
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                    pointerEvents="none"
                  />
                )}

                {selectedBrushRange && (
                  <g pointerEvents="none">
                    <rect
                      x={selectedBrushRange.minX}
                      y={paddingTop}
                      width={selectedBrushRange.maxX - selectedBrushRange.minX}
                      height={graphHeight}
                      fill="#38bdf8"
                      fillOpacity="0.18"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={selectedBrushRange.minX}
                      y1={paddingTop}
                      x2={selectedBrushRange.minX}
                      y2={paddingTop + graphHeight}
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                    <line
                      x1={selectedBrushRange.maxX}
                      y1={paddingTop}
                      x2={selectedBrushRange.maxX}
                      y2={paddingTop + graphHeight}
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                  </g>
                )}

                {/* Snapping Interactive Crosshairs */}
                {activeHoverPoint && (
                  <g pointerEvents="none">
                    {/* Vertical Snapping Crosshair Line */}
                    <line
                      x1={activeHoverPoint.x}
                      y1={paddingTop}
                      x2={activeHoverPoint.x}
                      y2={paddingTop + graphHeight}
                      stroke="#94a3b8"
                      strokeDasharray="2 2"
                      strokeWidth="1.5"
                    />

                    {/* Horizontal Snapping Crosshair Line */}
                    {viewMode === 'both' && (
                      <>
                        <line
                          x1={paddingLeft}
                          y1={activeHoverPoint.incomeY}
                          x2={paddingLeft + graphWidth}
                          y2={activeHoverPoint.incomeY}
                          stroke="#10b981"
                          strokeDasharray="2 2"
                          strokeWidth="1"
                          strokeOpacity="0.6"
                        />
                        <line
                          x1={paddingLeft}
                          y1={activeHoverPoint.expenseY}
                          x2={paddingLeft + graphWidth}
                          y2={activeHoverPoint.expenseY}
                          stroke="#ef4444"
                          strokeDasharray="2 2"
                          strokeWidth="1"
                          strokeOpacity="0.6"
                        />
                      </>
                    )}

                    {viewMode === 'income' && (
                      <line
                        x1={paddingLeft}
                        y1={activeHoverPoint.incomeY}
                        x2={paddingLeft + graphWidth}
                        y2={activeHoverPoint.incomeY}
                        stroke="#10b981"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    )}

                    {viewMode === 'expenses' && (
                      <line
                        x1={paddingLeft}
                        y1={activeHoverPoint.expenseY}
                        x2={paddingLeft + graphWidth}
                        y2={activeHoverPoint.expenseY}
                        stroke="#ef4444"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    )}

                    {viewMode === 'net' && (
                      <line
                        x1={paddingLeft}
                        y1={activeHoverPoint.netY}
                        x2={paddingLeft + graphWidth}
                        y2={activeHoverPoint.netY}
                        stroke="#38bdf8"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                      />
                    )}

                    {/* Snap Reticle Node */}
                    <circle
                      cx={activeHoverPoint.x}
                      cy={
                        viewMode === 'income'
                          ? activeHoverPoint.incomeY
                          : viewMode === 'expenses'
                          ? activeHoverPoint.expenseY
                          : activeHoverPoint.netY
                      }
                      r={7}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </g>

              {/* X Axis Baseline */}
              <line
                x1={paddingLeft}
                y1={paddingTop + graphHeight}
                x2={paddingLeft + graphWidth}
                y2={paddingTop + graphHeight}
                stroke="#374151"
                strokeWidth="1.5"
              />

              {/* X Axis Labels */}
              {points.map((p, idx) => {
                // If many points during high zoom, thin labels to avoid clutter
                if (points.length > 15 && idx % 2 !== 0 && zoomLevel <= 1.5) {
                  return null;
                }

                return (
                  <text
                    key={idx}
                    x={p.x}
                    y={paddingTop + graphHeight + 18}
                    textAnchor="middle"
                    fill={hoveredIndex === idx ? '#38bdf8' : '#9ca3af'}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight={hoveredIndex === idx ? 'bold' : 'normal'}
                  >
                    {p.label}
                  </text>
                );
              })}
            </svg>
          )}
        </div>

        {/* Hover Crosshair Telemetry HUD Card */}
        {activeHoverPoint && (
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-lg p-3 animate-in fade-in duration-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-sm bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                {activeHoverPoint.label}
              </span>
              <span className="text-[11px] text-neutral-400">
                ({activeHoverPoint.txCount} transactions logged)
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-neutral-400 text-[10px] block">INCOME</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(activeHoverPoint.income, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">EXPENSES</span>
                <span className="font-bold text-red-400">
                  {formatCurrency(activeHoverPoint.expenses > 0 ? -activeHoverPoint.expenses : 0, currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px] block">NET DELTA</span>
                <span
                  className={`font-bold ${
                    activeHoverPoint.net >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {activeHoverPoint.net >= 0 ? '+' : ''}
                  {formatCurrency(activeHoverPoint.net, currencySymbol)}
                </span>
              </div>

              {showMovingAverage && smaPoints[hoveredIndex!] && (
                <div>
                  <span className="text-amber-400/80 text-[10px] block">SMA ({smaPeriod})</span>
                  <span className="font-bold text-amber-300">
                    {formatCurrency(smaPoints[hoveredIndex!].avgVal, currencySymbol)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
};
