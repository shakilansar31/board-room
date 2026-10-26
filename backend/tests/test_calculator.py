import pytest
from backend.app.models.entities import Transaction
from backend.app.services.calculator import compute_financial_metrics

def test_empty_transactions():
    metrics = compute_financial_metrics([], currency="USD", is_sample=False)
    assert metrics.total_revenue == 0.0
    assert metrics.total_expenses == 0.0
    assert metrics.net_operating_result == 0.0
    assert metrics.operating_margin_percent is None
    assert metrics.total_transactions == 0
    assert len(metrics.accounting_limitations) > 0

def test_deterministic_kpis_calculation():
    txs = [
        Transaction(id="1", business_id="b1", date="2024-01-15", kind="revenue", category="Sales", amount=10000.0, currency="USD"),
        Transaction(id="2", business_id="b1", date="2024-01-20", kind="expense", category="Marketing", amount=3000.0, currency="USD"),
        Transaction(id="3", business_id="b1", date="2024-01-25", kind="expense", category="COGS", amount=4000.0, currency="USD"),
        Transaction(id="4", business_id="b1", date="2024-02-15", kind="revenue", category="Sales", amount=15000.0, currency="USD"),
        Transaction(id="5", business_id="b1", date="2024-02-20", kind="expense", category="COGS", amount=5000.0, currency="USD"),
    ]

    metrics = compute_financial_metrics(txs, currency="USD", is_sample=False)
    assert metrics.total_revenue == 25000.0
    assert metrics.total_expenses == 12000.0
    assert metrics.net_operating_result == 13000.0
    # Margin: 13000 / 25000 * 100 = 52.0%
    assert metrics.operating_margin_percent == 52.0
    assert metrics.total_transactions == 5
    assert len(metrics.monthly_trend) == 2
    
    # Month 1: Rev 10000, Exp 7000, Op 3000
    assert metrics.monthly_trend[0].month == "2024-01"
    assert metrics.monthly_trend[0].revenue == 10000.0
    assert metrics.monthly_trend[0].operating_result == 3000.0

    # Month 2: Rev 15000, Exp 5000, Op 10000
    assert metrics.monthly_trend[1].month == "2024-02"
    assert metrics.monthly_trend[1].revenue == 15000.0
    assert metrics.monthly_trend[1].operating_result == 10000.0

    # MoM Growth: (15000 - 10000) / 10000 = +50.0%
    assert metrics.mom_revenue_growth_percent == 50.0

def test_negative_operating_result():
    txs = [
        Transaction(id="1", business_id="b1", date="2024-01-15", kind="revenue", category="Sales", amount=5000.0, currency="USD"),
        Transaction(id="2", business_id="b1", date="2024-01-20", kind="expense", category="Rent", amount=10000.0, currency="USD"),
    ]
    metrics = compute_financial_metrics(txs, currency="USD")
    assert metrics.total_revenue == 5000.0
    assert metrics.total_expenses == 10000.0
    assert metrics.net_operating_result == -5000.0
    assert metrics.operating_margin_percent == -100.0
