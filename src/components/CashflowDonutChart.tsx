import React from 'react';
import { InteractiveFinanceChart, ChartSliceData } from './InteractiveFinanceChart';

interface CashflowDonutChartProps {
  title: string;
  data: ChartSliceData[];
  total: number;
  currencySymbol: string;
  type: 'income' | 'expense' | 'asset' | 'liability';
  onSelectCategory?: (category: string) => void;
}

export const CashflowDonutChart: React.FC<CashflowDonutChartProps> = (props) => {
  return <InteractiveFinanceChart {...props} />;
};

export { InteractiveFinanceChart };
