import os
import pandas as pd
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import SessionLocal, Base, engine
from backend.app.models.entities import Business, Document, Transaction, Meeting, Task
from backend.app.services.document_parser import parse_pdf

SAMPLE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../sample_data"))

def ensure_sample_files_exist():
    os.makedirs(SAMPLE_DIR, exist_ok=True)

    # 1. Scenario 1 CSV: Profit Decline & Margin Compression (in INR)
    csv1_path = os.path.join(SAMPLE_DIR, "scenario1_profit_decline.csv")
    data1 = [
        {"Date": "2024-01-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 850000.0, "Description": "Domestic retail & direct orders"},
        {"Date": "2024-01-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 340000.0, "Description": "Raw component manufacturing"},
        {"Date": "2024-01-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 120000.0, "Description": "Meta & Google Ads"},
        {"Date": "2024-01-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 80000.0, "Description": "Warehouse shipping across India"},
        {"Date": "2024-01-31", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 150000.0, "Description": "Operations & support staff"},

        {"Date": "2024-02-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 870000.0, "Description": "Domestic sales volume"},
        {"Date": "2024-02-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 365000.0, "Description": "Component cost escalation +7%"},
        {"Date": "2024-02-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 160000.0, "Description": "Elevated CAC on ad platforms"},
        {"Date": "2024-02-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 95000.0, "Description": "Air freight express surcharge"},
        {"Date": "2024-02-29", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 150000.0, "Description": "Team payroll"},

        {"Date": "2024-03-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 840000.0, "Description": "Quarter-end sales volume"},
        {"Date": "2024-03-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 390000.0, "Description": "Raw materials price hike"},
        {"Date": "2024-03-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 210000.0, "Description": "Competitive bidding escalation"},
        {"Date": "2024-03-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 110000.0, "Description": "Expedited reshipments"},
        {"Date": "2024-03-31", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 155000.0, "Description": "Overtime labor"},

        {"Date": "2024-04-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 820000.0, "Description": "Festival promotions"},
        {"Date": "2024-04-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 410000.0, "Description": "Packaging supplier surge"},
        {"Date": "2024-04-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 240000.0, "Description": "Diminishing ad returns"},
        {"Date": "2024-04-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 125000.0, "Description": "Courier rate changes"},
        {"Date": "2024-04-30", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 160000.0, "Description": "Staff payroll"},

        {"Date": "2024-05-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 810000.0, "Description": "Direct channels"},
        {"Date": "2024-05-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 420000.0, "Description": "COGS at 51.8% of revenue"},
        {"Date": "2024-05-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 270000.0, "Description": "High CAC retargeting"},
        {"Date": "2024-05-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 130000.0, "Description": "RTO return processing fees"},
        {"Date": "2024-05-31", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 160000.0, "Description": "Staff payroll"},

        {"Date": "2024-06-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 795000.0, "Description": "Mid-year volume"},
        {"Date": "2024-06-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 435000.0, "Description": "Component pricing locked high"},
        {"Date": "2024-06-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 290000.0, "Description": "Unprofitable customer acquisition"},
        {"Date": "2024-06-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 140000.0, "Description": "Logistics partner rate hikes"},
        {"Date": "2024-06-30", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 160000.0, "Description": "Staff payroll"}
    ]
    df1 = pd.DataFrame(data1)
    df1.to_csv(csv1_path, index=False)

    # 2. Scenario 2 CSV: New Product Launch (Nova SaaS in INR)
    csv2_path = os.path.join(SAMPLE_DIR, "scenario2_saas_metrics.csv")
    data2 = [
        {"Date": "2024-03-01", "Type": "Revenue", "Category": "Enterprise Subscriptions", "Amount": 650000.0, "Description": "Platform license contracts"},
        {"Date": "2024-03-10", "Type": "Expense", "Category": "Cloud Infrastructure", "Amount": 140000.0, "Description": "AWS & database servers"},
        {"Date": "2024-03-20", "Type": "Expense", "Category": "Engineering Salaries", "Amount": 380000.0, "Description": "6 core engineers in Bengaluru"},
        {"Date": "2024-03-28", "Type": "Expense", "Category": "Sales & Marketing", "Amount": 90000.0, "Description": "Outbound tooling & outreach"},

        {"Date": "2024-04-01", "Type": "Revenue", "Category": "Enterprise Subscriptions", "Amount": 720000.0, "Description": "Account expansion revenue"},
        {"Date": "2024-04-10", "Type": "Expense", "Category": "Cloud Infrastructure", "Amount": 155000.0, "Description": "Compute & storage consumption"},
        {"Date": "2024-04-20", "Type": "Expense", "Category": "Engineering Salaries", "Amount": 380000.0, "Description": "Engineering payroll"},
        {"Date": "2024-04-28", "Type": "Expense", "Category": "Sales & Marketing", "Amount": 110000.0, "Description": "Tech summit sponsorship"}
    ]
    df2 = pd.DataFrame(data2)
    df2.to_csv(csv2_path, index=False)

    # 3. Scenario 3 CSV: Expansion Decision (Lumina Retail vs DTC in INR)
    csv3_path = os.path.join(SAMPLE_DIR, "scenario3_expansion_channels.csv")
    data3 = [
        {"Date": "2024-05-01", "Type": "Revenue", "Category": "Regional Store Sales", "Amount": 1150000.0, "Description": "Store footprint (Mumbai & Pune)"},
        {"Date": "2024-05-05", "Type": "Revenue", "Category": "Direct-to-Consumer Web", "Amount": 620000.0, "Description": "Online web store sales"},
        {"Date": "2024-05-15", "Type": "Expense", "Category": "Store Leases & Utilities", "Amount": 320000.0, "Description": "Retail commercial rent"},
        {"Date": "2024-05-20", "Type": "Expense", "Category": "Retail Store Staffing", "Amount": 280000.0, "Description": "Store managers & staff"},
        {"Date": "2024-05-25", "Type": "Expense", "Category": "Digital Fulfillment & Web Ads", "Amount": 210000.0, "Description": "3PL warehouse & Google Shopping"},
        {"Date": "2024-05-30", "Type": "Expense", "Category": "Merchandise Inventory", "Amount": 480000.0, "Description": "Supplier wholesale manufacturing"}
    ]
    df3 = pd.DataFrame(data3)
    df3.to_csv(csv3_path, index=False)

    # 4. Generate Sample PDF: Operational Audit Report in INR
    pdf_path = os.path.join(SAMPLE_DIR, "sample_operational_audit.pdf")
    doc = SimpleDocTemplate(pdf_path, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("<b>APEX COMMERCE — CONFIDENTIAL OPERATIONAL & SUPPLIER AUDIT (INR)</b>", styles['Title']),
        Spacer(1, 12),
        Paragraph("<b>Page 1: Supplier Contracts & Fulfillment Friction</b>", styles['Heading2']),
        Paragraph(
            "Primary component supplier agreement was revised in February 2024. "
            "The renegotiated terms introduced a mandatory 11% surcharge on key raw assemblies. "
            "Furthermore, minimum order quantities (MOQ) were increased, locking up an additional ₹6,50,000 in working capital. "
            "Air express delivery surcharges between manufacturing hubs have averaged 18% above budgeted allocations.",
            styles['Normal']
        ),
        Spacer(1, 14),
        Paragraph("<b>Page 2: Marketing Channel Attribution & Customer Returns</b>", styles['Heading2']),
        Paragraph(
            "Meta and digital advertising acquisition costs rose sharply. "
            "Blended Customer Acquisition Cost (CAC) rose from ₹380 to ₹840 per acquired buyer in May 2024. "
            "Customer return rate (RTO) on the V2 product line increased from 3.2% to 7.8% due to transit packaging damage. "
            "Recommended corrective action: Halt unprofitable retargeting campaigns and negotiate bulk local packaging supplies.",
            styles['Normal']
        )
    ]
    doc.build(elements)

def seed_sample_businesses(db: Session):
    ensure_sample_files_exist()

    # Clear old sample businesses to ensure clean INR setup
    sample_biz_names = [
        "Apex Hardware & Outdoor Gear [SAMPLE]",
        "Nova Data Analytics [SAMPLE]",
        "Lumina Home Goods [SAMPLE]"
    ]
    db.query(Business).filter(Business.name.in_(sample_biz_names)).delete(synchronize_session=False)
    db.commit()

    # Scenario 1: Profit Decline (Apex Hardware & Gear)
    biz1 = Business(
        name="Apex Hardware & Outdoor Gear [SAMPLE]",
        industry="Consumer Durables & E-Commerce",
        location="Bengaluru, Karnataka",
        currency="INR",
        description="Mid-sized manufacturer and distributor of rugged hardware, outdoor gear, and direct-to-consumer lifestyle accessories across India.",
        goals="Reverse recent 4-month margin compression, stabilize net operating cash-flow, and reduce customer acquisition costs.",
        constraints="Strictly self-funded working capital; maximum 6-month payback requirement; debt capacity capped.",
        is_sample=1
    )
    db.add(biz1)
    db.commit()
    db.refresh(biz1)

    # Ingest CSV1
    csv1_path = os.path.join(SAMPLE_DIR, "scenario1_profit_decline.csv")
    df1 = pd.read_csv(csv1_path)
    for _, row in df1.iterrows():
        db.add(Transaction(
            business_id=biz1.id,
            date=row["Date"],
            kind=row["Type"].lower(),
            category=row["Category"],
            amount=float(row["Amount"]),
            currency="INR",
            description=str(row["Description"])
        ))

    # Ingest PDF
    pdf_path = os.path.join(SAMPLE_DIR, "sample_operational_audit.pdf")
    text, p_count, meta = parse_pdf(pdf_path)
    doc1 = Document(
        business_id=biz1.id,
        filename="sample_operational_audit.pdf",
        original_name="Apex_Operational_Audit_Q2.pdf",
        mime_type="application/pdf",
        storage_path=pdf_path,
        extracted_text=text,
        page_count=p_count,
        status="ready",
        metadata_json="{}"
    )
    db.add(doc1)
    db.commit()

    # Scenario 2: New Product Launch (Nova Analytics SaaS)
    biz2 = Business(
        name="Nova Data Analytics [SAMPLE]",
        industry="Enterprise B2B Software",
        location="Pune, Maharashtra",
        currency="INR",
        description="B2B software startup providing automated data pipeline monitoring and observability dashboards for retailers.",
        goals="Evaluate whether to launch an automated AI predictive forecasting add-on module vs. focusing purely on core platform stability.",
        constraints="Engineering capacity is capped at 6 developers in India; monthly AWS budget capped at ₹1,50,000 before commercial revenue validation.",
        is_sample=1
    )
    db.add(biz2)
    db.commit()
    db.refresh(biz2)

    csv2_path = os.path.join(SAMPLE_DIR, "scenario2_saas_metrics.csv")
    df2 = pd.read_csv(csv2_path)
    for _, row in df2.iterrows():
        db.add(Transaction(
            business_id=biz2.id,
            date=row["Date"],
            kind=row["Type"].lower(),
            category=row["Category"],
            amount=float(row["Amount"]),
            currency="INR",
            description=str(row["Description"])
        ))
    db.commit()

    # Scenario 3: Expansion Decision (Lumina Retail & Home)
    biz3 = Business(
        name="Lumina Home Goods [SAMPLE]",
        industry="Home & Lifestyle Retail",
        location="Mumbai, Maharashtra",
        currency="INR",
        description="Specialty home goods and lighting brand weighing two expansion avenues: opening 2 new physical retail stores in secondary metros vs. heavily scaling direct-to-consumer digital channels.",
        goals="Determine the highest risk-adjusted ROI pathway between physical brick-and-mortar leases vs digital national e-commerce scale.",
        constraints="Total expansion capital capped at ₹15,00,000 over 12 months; cannot support simultaneous lease commitments and national advertising.",
        is_sample=1
    )
    db.add(biz3)
    db.commit()
    db.refresh(biz3)

    csv3_path = os.path.join(SAMPLE_DIR, "scenario3_expansion_channels.csv")
    df3 = pd.read_csv(csv3_path)
    for _, row in df3.iterrows():
        db.add(Transaction(
            business_id=biz3.id,
            date=row["Date"],
            kind=row["Type"].lower(),
            category=row["Category"],
            amount=float(row["Amount"]),
            currency="INR",
            description=str(row["Description"])
        ))
    db.commit()

    return [biz1.id, biz2.id, biz3.id]
