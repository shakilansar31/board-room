import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line
} from 'recharts';
import { FinancialMetrics } from '../lib/types';
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface FinancialChartsProps {
  metrics: FinancialMetrics | null;
  currency: string;
}

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ metrics, currency }) => {
  if (!metrics || metrics.total_transactions === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
        <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">No Financial Data Ingested</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Upload a CSV or Excel spreadsheet of sales and expenses in the Data Ingestion tab to compute deterministic revenue, operating margin, and category trends.
        </p>
      </div>
    );
  }

  const trendData = metrics.monthly_trend.map(m => ({
    name: m.month,
    Revenue: m.revenue,
    Expense: m.expense,
    'Operating Result': m.operating_result,
    Margin: m.margin_percent ?? 0
  }));

  const categoryData = metrics.category_breakdown
    .filter(c => c.kind === 'expense')
    .slice(0, 6)
    .map(c => ({
      name: c.category.length > 16 ? c.category.slice(0, 16) + '...' : c.category,
      Amount: c.total_amount,
      Percentage: c.percentage_of_total
    }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Total Ingested Revenue</p>
          <p className="text-xl font-bold text-slate-100 mt-1">
            {currency} {metrics.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {metrics.mom_revenue_growth_percent != null && (
            <p className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${metrics.mom_revenue_growth_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <TrendingUp className="w-3 h-3" />
              {metrics.mom_revenue_growth_percent >= 0 ? '+' : ''}{metrics.mom_revenue_growth_percent}% MoM
            </p>
          )}
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Total Ingested Expenses</p>
          <p className="text-xl font-bold text-slate-100 mt-1">
            {currency} {metrics.total_expenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {metrics.mom_expense_growth_percent != null && (
            <p className={`text-[11px] mt-1 font-semibold flex items-center gap-1 ${metrics.mom_expense_growth_percent <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {metrics.mom_expense_growth_percent >= 0 ? '+' : ''}{metrics.mom_expense_growth_percent}% MoM
            </p>
          )}
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Net Operating Result</p>
          <p className={`text-xl font-bold mt-1 ${metrics.net_operating_result >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {currency} {metrics.net_operating_result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Before taxes & debt service</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium">Operating Margin</p>
          <p className={`text-xl font-bold mt-1 ${metrics.operating_margin_percent != null && metrics.operating_margin_percent >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
            {metrics.operating_margin_percent != null ? `${metrics.operating_margin_percent}%` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{metrics.total_transactions} records recorded</p>
        </div>
      </div>

      {/* Coverage & Limitations Callout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <b>Ledger Period:</b> {metrics.coverage_start || 'N/A'} to {metrics.coverage_end || 'N/A'} ({metrics.total_transactions} transactions)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          Calculated deterministically via Pandas/Python
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Expense */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-bold text-slate-200 mb-1">Monthly Ingested Cash-Flow</h4>
          <p className="text-xs text-slate-400 mb-4">Revenue vs. operating expenses by calendar month</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${currency} ${Number(val).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <h4 className="text-sm font-bold text-slate-200 mb-1">Top Operating Expense Drivers</h4>
          <p className="text-xs text-slate-400 mb-4">Largest cost centers by dollar volume</p>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={100} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${currency} ${Number(val).toLocaleString()}`, 'Amount']}
                />
                <Bar dataKey="Amount" fill="#eab308" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
