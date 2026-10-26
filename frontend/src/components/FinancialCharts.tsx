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
import { TrendingUp, AlertCircle, Calendar } from 'lucide-react';

interface FinancialChartsProps {
  metrics: FinancialMetrics | null;
  currency: string;
}

// Format numbers in Indian numbering system (Lakhs / Crores) or standard with ₹
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
      <div className="rounded-xl border-[2.5px] border-dashed border-black bg-white p-8 text-center shadow-[4px_4px_0px_0px_#000]">
        <AlertCircle className="w-8 h-8 text-black mx-auto mb-2" />
        <h4 className="text-sm font-black text-black">No Financial Data Ingested Yet</h4>
        <p className="text-xs text-slate-700 max-w-md mx-auto mt-1 font-medium">
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
      name: c.category.length > 16 ? c.category.slice(0, 16) + '...' : c.category,
      Amount: c.total_amount,
      Percentage: c.percentage_of_total
    }));

  return (
    <div className="space-y-6">
      {/* Neo-brutalist KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-[#BAE6FD] border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-xs font-black uppercase tracking-wider text-black">Total Ingested Revenue</p>
          <p className="text-xl font-black text-black mt-1">
            {sym} {formatINR(metrics.total_revenue)}
          </p>
          {metrics.mom_revenue_growth_percent != null && (
            <p className={`text-[11px] mt-1.5 font-bold flex items-center gap-1 ${metrics.mom_revenue_growth_percent >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
              {metrics.mom_revenue_growth_percent >= 0 ? '+' : ''}{metrics.mom_revenue_growth_percent}% MoM
            </p>
          )}
        </div>

        {/* Total Expenses */}
        <div className="bg-[#FECDD3] border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-xs font-black uppercase tracking-wider text-black">Total Ingested Expenses</p>
          <p className="text-xl font-black text-black mt-1">
            {sym} {formatINR(metrics.total_expenses)}
          </p>
          {metrics.mom_expense_growth_percent != null && (
            <p className={`text-[11px] mt-1.5 font-bold flex items-center gap-1 ${metrics.mom_expense_growth_percent <= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {metrics.mom_expense_growth_percent >= 0 ? '+' : ''}{metrics.mom_expense_growth_percent}% MoM
            </p>
          )}
        </div>

        {/* Net Operating Result */}
        <div className="bg-[#BBF7D0] border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-xs font-black uppercase tracking-wider text-black">Net Operating Result</p>
          <p className="text-xl font-black text-black mt-1">
            {sym} {formatINR(metrics.net_operating_result)}
          </p>
          <p className="text-[10px] text-slate-800 font-bold mt-1">Before tax & financing</p>
        </div>

        {/* Operating Margin */}
        <div className="bg-[#FEF08A] border-[2.5px] border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-xs font-black uppercase tracking-wider text-black">Operating Margin</p>
          <p className="text-xl font-black text-black mt-1">
            {metrics.operating_margin_percent != null ? `${metrics.operating_margin_percent}%` : 'N/A'}
          </p>
          <p className="text-[10px] text-slate-800 font-bold mt-1">{metrics.total_transactions} records ledger</p>
        </div>
      </div>

      {/* Coverage & Verification Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-white border-[2px] border-black rounded-xl p-3.5 shadow-[3px_3px_0px_0px_#000]">
        <div className="flex items-center gap-2 font-bold text-black">
          <Calendar className="w-4 h-4 text-black shrink-0" />
          <span>
            <b>Ledger Period:</b> {metrics.coverage_start || 'N/A'} to {metrics.coverage_end || 'N/A'} ({metrics.total_transactions} transactions)
          </span>
        </div>
        <div className="flex items-center gap-2 text-black text-[11px] font-black bg-[#FFE600] px-2.5 py-1 rounded border-2 border-black shadow-[2px_2px_0px_0px_#000]">
          <span className="w-2 h-2 rounded-full bg-black inline-block" />
          Deterministic Pandas Calculator (₹ INR)
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue vs Expense */}
        <div className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[5px_5px_0px_0px_#000]">
          <div className="border-b-2 border-black pb-2 mb-4">
            <h4 className="text-sm font-black text-black">Monthly Ingested Cash-Flow (₹)</h4>
            <p className="text-xs text-slate-600 font-bold">Revenue inflows vs. operating costs by month</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#000" fontSize={11} fontWeight={700} tickLine={false} />
                <YAxis stroke="#000" fontSize={11} fontWeight={700} tickLine={false} tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v / 1000 + 'k'}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: '2px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', boxShadow: '3px 3px 0px 0px #000' }}
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="Revenue" fill="#3B82F6" stroke="#000" strokeWidth={1.5} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Expense" fill="#FB7185" stroke="#000" strokeWidth={1.5} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Expense Categories */}
        <div className="bg-white border-[2.5px] border-black rounded-xl p-5 shadow-[5px_5px_0px_0px_#000]">
          <div className="border-b-2 border-black pb-2 mb-4">
            <h4 className="text-sm font-black text-black">Major Operating Expense Centers (₹)</h4>
            <p className="text-xs text-slate-600 font-bold">Cost breakdown in Indian Rupees</p>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#000" fontSize={11} fontWeight={700} tickFormatter={(v) => `₹${v >= 100000 ? (v / 100000).toFixed(1) + 'L' : v / 1000 + 'k'}`} />
                <YAxis type="category" dataKey="name" stroke="#000" fontSize={10} fontWeight={700} width={100} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#000000', borderWidth: '2px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', boxShadow: '3px 3px 0px 0px #000' }}
                  formatter={(val: any) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Total Spend']}
                />
                <Bar dataKey="Amount" fill="#FBBF24" stroke="#000" strokeWidth={1.5} radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
