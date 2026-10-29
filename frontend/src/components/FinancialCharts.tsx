import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { FinancialMetrics } from '../lib/types';
import { TrendingUp, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';

interface FinancialChartsProps {
  metrics: FinancialMetrics | null;
  currency: string;
}

// Format numbers in Indian numbering system with ₹
const formatINR = (val: number): string => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(val);
};

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ metrics }) => {
  const sym = '₹';

  if (!metrics || metrics.total_transactions === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-800">No Financial Data Ingested Yet</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
          Upload a CSV or Excel spreadsheet of sales and expenses in the Data Ingestion tab to compute deterministic revenue, operating margin, and category trends in Indian Rupees (₹).
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
      name: c.category.length > 18 ? c.category.slice(0, 18) + '...' : c.category,
      Amount: c.total_amount,
      Percentage: c.percentage_of_total
    }));

  return (
    <div className="space-y-6">
      {/* Minimal Stat KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Revenue</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {sym} {formatINR(metrics.total_revenue)}
          </p>
          {metrics.mom_revenue_growth_percent != null && (
            <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${metrics.mom_revenue_growth_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              {metrics.mom_revenue_growth_percent >= 0 ? '+' : ''}{metrics.mom_revenue_growth_percent}% MoM
            </p>
          )}
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Expenses</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {sym} {formatINR(metrics.total_expenses)}
          </p>
          {metrics.mom_expense_growth_percent != null && (
            <p className={`text-[11px] mt-1.5 font-medium flex items-center gap-1 ${metrics.mom_expense_growth_percent <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" />
              {metrics.mom_expense_growth_percent >= 0 ? '+' : ''}{metrics.mom_expense_growth_percent}% MoM
            </p>
          )}
        </div>

        {/* Net Operating Result */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Net Operating Result</p>
          <p className={`text-xl font-bold mt-1 ${metrics.net_operating_result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {sym} {formatINR(metrics.net_operating_result)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pre-tax operating income</p>
        </div>

        {/* Operating Margin */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Operating Margin</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {metrics.operating_margin_percent != null ? `${metrics.operating_margin_percent}%` : 'N/A'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{metrics.total_transactions} transactions audited</p>
        </div>
      </div>

      {/* Coverage & Verification Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            <strong className="text-slate-800">Ledger Period:</strong> {metrics.coverage_start || 'N/A'} to {metrics.coverage_end || 'N/A'} ({metrics.total_transactions} records)
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-medium bg-white px-2.5 py-1 rounded-md border border-slate-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Deterministic Pandas Calculator (₹ INR)
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Expense */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h4 className="text-sm font-semibold text-slate-900">Monthly Cash Flow (₹)</h4>
            <p className="text-xs text-slate-500">Revenue inflows vs. operating costs by month</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v / 1000 + 'k'}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '1px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-4">
            <h4 className="text-sm font-semibold text-slate-900">Major Operating Expense Centers (₹)</h4>
            <p className="text-xs text-slate-500">Cost breakdown in Indian Rupees</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v / 1000 + 'k'}`} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={110} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: '1px', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Total Spend']}
                />
                <Bar dataKey="Amount" fill="#6366F1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
