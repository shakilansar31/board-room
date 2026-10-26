from typing import List, Dict, Any, Optional
import pandas as pd
from backend.app.models.entities import Transaction
from backend.app.models.schemas import FinancialMetricsOut, MonthlyMetric, CategoryBreakdown

def compute_financial_metrics(transactions: List[Transaction], currency: str = "USD", is_sample: bool = False) -> FinancialMetricsOut:
    """
    Computes deterministic financial KPIs using Python & Pandas.
    Follows conservative GAAP/management accounting definitions:
    - Never calls operating result 'Net Profit' unless taxes, interest, depreciation, etc. are accounted for.
    - Accurately computes monthly MoM changes and category breakdown.
    - Explains limitations and data coverage period.
    """
    if not transactions:
        return FinancialMetricsOut(
            currency=currency,
            total_revenue=0.0,
            total_expenses=0.0,
            net_operating_result=0.0,
            operating_margin_percent=None,
            coverage_start=None,
            coverage_end=None,
            total_transactions=0,
            monthly_trend=[],
            category_breakdown=[],
            mom_revenue_growth_percent=None,
            mom_expense_growth_percent=None,
            accounting_limitations=[
                "No transaction records imported yet.",
                "Figures cannot reflect unrecorded payables, receivables, or overheads."
            ],
            is_sample_data=is_sample
        )

    # Convert transactions to DataFrame
    data = [
        {
            "date": t.date,
            "kind": (t.kind or "expense").strip().lower(),
            "category": (t.category or "Uncategorized").strip(),
            "amount": float(t.amount or 0.0),
        }
        for t in transactions
    ]
    df = pd.DataFrame(data)

    # Safe parsing of date strings
    df["datetime"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["datetime"])
    if df.empty:
        return FinancialMetricsOut(
            currency=currency,
            total_revenue=0.0,
            total_expenses=0.0,
            net_operating_result=0.0,
            operating_margin_percent=None,
            coverage_start=None,
            coverage_end=None,
            total_transactions=len(transactions),
            monthly_trend=[],
            category_breakdown=[],
            mom_revenue_growth_percent=None,
            mom_expense_growth_percent=None,
            accounting_limitations=["All dates were unparseable."],
            is_sample_data=is_sample
        )

    df["month"] = df["datetime"].dt.strftime("%Y-%m")
    df = df.sort_values(by="datetime")

    rev_mask = df["kind"] == "revenue"
    exp_mask = df["kind"] == "expense"

    total_revenue = round(float(df[rev_mask]["amount"].sum()), 2)
    total_expenses = round(float(df[exp_mask]["amount"].sum()), 2)
    net_operating_result = round(total_revenue - total_expenses, 2)

    # Operating Margin: only valid when total_revenue > 0
    operating_margin_percent = round((net_operating_result / total_revenue) * 100, 2) if total_revenue > 0 else None

    # Coverage period
    coverage_start = df["date"].min()
    coverage_end = df["date"].max()

    # Monthly Trend aggregation
    months = sorted(df["month"].unique().tolist())
    monthly_trend: List[MonthlyMetric] = []
    
    for m in months:
        m_df = df[df["month"] == m]
        m_rev = round(float(m_df[m_df["kind"] == "revenue"]["amount"].sum()), 2)
        m_exp = round(float(m_df[m_df["kind"] == "expense"]["amount"].sum()), 2)
        m_op = round(m_rev - m_exp, 2)
        m_margin = round((m_op / m_rev) * 100, 2) if m_rev > 0 else None
        
        monthly_trend.append(
            MonthlyMetric(
                month=m,
                revenue=m_rev,
                expense=m_exp,
                operating_result=m_op,
                margin_percent=m_margin
            )
        )

    # MoM calculations between last two recorded months if available
    mom_revenue_growth_percent: Optional[float] = None
    mom_expense_growth_percent: Optional[float] = None
    if len(monthly_trend) >= 2:
        last = monthly_trend[-1]
        prev = monthly_trend[-2]
        if prev.revenue > 0:
            mom_revenue_growth_percent = round(((last.revenue - prev.revenue) / prev.revenue) * 100, 2)
        if prev.expense > 0:
            mom_expense_growth_percent = round(((last.expense - prev.expense) / prev.expense) * 100, 2)

    # Category Breakdown
    cat_group = df.groupby(["kind", "category"])["amount"].sum().reset_index()
    category_breakdown: List[CategoryBreakdown] = []
    for _, row in cat_group.iterrows():
        kind = str(row["kind"])
        base_total = total_revenue if kind == "revenue" else total_expenses
        amt = round(float(row["amount"]), 2)
        pct = round((amt / base_total) * 100, 2) if base_total > 0 else 0.0
        category_breakdown.append(
            CategoryBreakdown(
                category=str(row["category"]),
                kind=kind,
                total_amount=amt,
                percentage_of_total=pct
            )
        )
    # Sort categories by total_amount descending
    category_breakdown.sort(key=lambda x: x.total_amount, reverse=True)

    # Accounting limitations
    accounting_limitations = [
        "Net Operating Result reflects only ingested revenues minus operating expenses.",
        "Does NOT deduct corporate income tax, loan interest, depreciation, amortization, or equity adjustments unless explicitly categorized.",
        "Cash-flow timing, deferred receivables, and outstanding accounts payable are excluded unless documented.",
        f"Data coverage represents {len(transactions)} transaction records from {coverage_start} to {coverage_end}."
    ]

    return FinancialMetricsOut(
        currency=currency,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_operating_result=net_operating_result,
        operating_margin_percent=operating_margin_percent,
        coverage_start=coverage_start,
        coverage_end=coverage_end,
        total_transactions=len(transactions),
        monthly_trend=monthly_trend,
        category_breakdown=category_breakdown,
        mom_revenue_growth_percent=mom_revenue_growth_percent,
        mom_expense_growth_percent=mom_expense_growth_percent,
        accounting_limitations=accounting_limitations,
        is_sample_data=is_sample
    )
