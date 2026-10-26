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

    # 1. Scenario 1 CSV: Profit Decline & Margin Compression
    csv1_path = os.path.join(SAMPLE_DIR, "scenario1_profit_decline.csv")
    if not os.path.exists(csv1_path):
        data1 = [
            # 6 months showing steady revenue but skyrocketing ad spend and supplier costs
            {"Date": "2024-01-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 85000.0, "Description": "Wholesale & direct orders"},
            {"Date": "2024-01-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 34000.0, "Description": "Raw component manufacturing"},
            {"Date": "2024-01-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 12000.0, "Description": "Meta & Google Ads"},
            {"Date": "2024-01-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 8000.0, "Description": "Warehouse shipping"},
            {"Date": "2024-01-31", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 15000.0, "Description": "Support & fulfillment team"},

            {"Date": "2024-02-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 87000.0, "Description": "Wholesale & direct orders"},
            {"Date": "2024-02-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 36500.0, "Description": "Component cost increase +7%"},
            {"Date": "2024-02-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 16000.0, "Description": "Elevated CAC on ad platforms"},
            {"Date": "2024-02-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 9500.0, "Description": "Air freight fuel surcharge"},
            {"Date": "2024-02-29", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 15000.0, "Description": "Team salaries"},

            {"Date": "2024-03-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 84000.0, "Description": "Quarter-end sales volume"},
            {"Date": "2024-03-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 39000.0, "Description": "Supplier tariff adjustment"},
            {"Date": "2024-03-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 21000.0, "Description": "Competitive bidding escalation"},
            {"Date": "2024-03-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 11000.0, "Description": "Expedited customer reshipments"},
            {"Date": "2024-03-31", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 15500.0, "Description": "Contract labor overtime"},

            {"Date": "2024-04-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 82000.0, "Description": "Spring promotions"},
            {"Date": "2024-04-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 41000.0, "Description": "Packaging supplier surge"},
            {"Date": "2024-04-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 24000.0, "Description": "Diminishing ad conversion returns"},
            {"Date": "2024-04-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 12500.0, "Description": "Carrier rate hike"},
            {"Date": "2024-04-30", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 16000.0, "Description": "Core operational staffing"},

            {"Date": "2024-05-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 81000.0, "Description": "Direct channels"},
            {"Date": "2024-05-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 42000.0, "Description": "COGS at 51.8% of revenue"},
            {"Date": "2024-05-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 27000.0, "Description": "Underperforming retargeting"},
            {"Date": "2024-05-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 13000.0, "Description": "Storage & return processing"},
            {"Date": "2024-05-31", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 16000.0, "Description": "Staff payroll"},

            {"Date": "2024-06-15", "Type": "Revenue", "Category": "Product Sales", "Amount": 79500.0, "Description": "Mid-year volume"},
            {"Date": "2024-06-20", "Type": "Expense", "Category": "Cost of Goods Sold", "Amount": 43500.0, "Description": "Component pricing locked high"},
            {"Date": "2024-06-25", "Type": "Expense", "Category": "Paid Marketing", "Amount": 29000.0, "Description": "Unprofitable customer acquisition"},
            {"Date": "2024-06-28", "Type": "Expense", "Category": "Fulfillment & Logistics", "Amount": 14000.0, "Description": "Freight rate changes"},
            {"Date": "2024-06-30", "Type": "Expense", "Category": "Payroll & Operations", "Amount": 16000.0, "Description": "Staff payroll"}
        ]
        df1 = pd.DataFrame(data1)
        df1.to_csv(csv1_path, index=False)

    # 2. Scenario 2 CSV: New Product Launch (SaaS / B2B)
    csv2_path = os.path.join(SAMPLE_DIR, "scenario2_saas_metrics.csv")
    if not os.path.exists(csv2_path):
        data2 = [
            {"Date": "2024-03-01", "Type": "Revenue", "Category": "Enterprise Subscriptions", "Amount": 65000.0, "Description": "Core platform licenses"},
            {"Date": "2024-03-10", "Type": "Expense", "Category": "Cloud Infrastructure", "Amount": 14000.0, "Description": "AWS & database hosting"},
            {"Date": "2024-03-20", "Type": "Expense", "Category": "Engineering Salaries", "Amount": 38000.0, "Description": "6 core engineers"},
            {"Date": "2024-03-28", "Type": "Expense", "Category": "Sales & Marketing", "Amount": 9000.0, "Description": "Outbound SDR tooling"},

            {"Date": "2024-04-01", "Type": "Revenue", "Category": "Enterprise Subscriptions", "Amount": 72000.0, "Description": "Expansion revenue"},
            {"Date": "2024-04-10", "Type": "Expense", "Category": "Cloud Infrastructure", "Amount": 15500.0, "Description": "Compute usage growth"},
            {"Date": "2024-04-20", "Type": "Expense", "Category": "Engineering Salaries", "Amount": 38000.0, "Description": "Core engineering payroll"},
            {"Date": "2024-04-28", "Type": "Expense", "Category": "Sales & Marketing", "Amount": 11000.0, "Description": "Industry conference sponsorship"}
        ]
        df2 = pd.DataFrame(data2)
        df2.to_csv(csv2_path, index=False)

    # 3. Scenario 3 CSV: Expansion Decision (Regional Retail vs DTC)
    csv3_path = os.path.join(SAMPLE_DIR, "scenario3_expansion_channels.csv")
    if not os.path.exists(csv3_path):
        data3 = [
            {"Date": "2024-05-01", "Type": "Revenue", "Category": "Regional Store Sales", "Amount": 115000.0, "Description": "Existing retail footprint (2 stores)"},
            {"Date": "2024-05-05", "Type": "Revenue", "Category": "Direct-to-Consumer Web", "Amount": 62000.0, "Description": "National online sales"},
            {"Date": "2024-05-15", "Type": "Expense", "Category": "Store Leases & Utilities", "Amount": 32000.0, "Description": "Physical store occupancy"},
            {"Date": "2024-05-20", "Type": "Expense", "Category": "Retail Store Staffing", "Amount": 28000.0, "Description": "Store managers & associates"},
            {"Date": "2024-05-25", "Type": "Expense", "Category": "Digital Fulfillment & Web Ads", "Amount": 21000.0, "Description": "Pick/pack & Google Shopping"},
            {"Date": "2024-05-30", "Type": "Expense", "Category": "Merchandise Inventory", "Amount": 48000.0, "Description": "Wholesale supplier orders"}
        ]
        df3 = pd.DataFrame(data3)
        df3.to_csv(csv3_path, index=False)

    # 4. Generate Sample PDF: Operational Audit Report
    pdf_path = os.path.join(SAMPLE_DIR, "sample_operational_audit.pdf")
    if not os.path.exists(pdf_path):
        doc = SimpleDocTemplate(pdf_path, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = [
            Paragraph("<b>APEX COMMERCE — CONFIDENTIAL OPERATIONAL & SUPPLIER AUDIT</b>", styles['Title']),
            Spacer(1, 12),
            Paragraph("<b>Page 1: Supplier Contracts & Fulfillment Friction</b>", styles['Heading2']),
            Paragraph(
                "Primary manufacturing contract with Pacific Rim Fabrication expired in February 2024. "
                "The renegotiated terms introduced a mandatory 11% surcharge on titanium fasteners and micro-controllers. "
                "Furthermore, minimum order quantities (MOQ) were increased from 1,000 units to 2,500 units, "
                "increasing working capital lock-up by $65,000. Carrier fuel surcharges for air freight have averaged 18% above budget.",
                styles['Normal']
            ),
            Spacer(1, 14),
            Paragraph("<b>Page 2: Marketing Channel Attribution & Customer Returns</b>", styles['Heading2']),
            Paragraph(
                "Meta advertising performance dropped significantly following platform privacy updates. "
                "Blended Customer Acquisition Cost (CAC) rose from $38.50 in Q4 to $84.20 in May 2024. "
                "Customer return rate on the V2 product line increased from 3.2% to 7.8% due to inconsistent packaging protection during freight transit. "
                "Recommended corrective action: Pause underperforming retargeting campaigns and negotiate bulk corrugated box supplies.",
                styles['Normal']
            )
        ]
        doc.build(elements)

def seed_sample_businesses(db: Session):
    ensure_sample_files_exist()

    # Scenario 1: Profit Decline (Apex Hardware & Gear)
    biz1 = db.query(Business).filter(Business.name == "Apex Hardware & Outdoor Gear [SAMPLE]").first()
    if not biz1:
        biz1 = Business(
            name="Apex Hardware & Outdoor Gear [SAMPLE]",
            industry="Consumer Durables & E-Commerce",
            location="Denver, Colorado",
            currency="USD",
            description="Mid-sized manufacturer and distributor of rugged outdoor equipment, camping hardware, and direct-to-consumer gear.",
            goals="Reverse recent 4-month margin compression, stabilize net operating cash-flow, and reduce customer acquisition costs.",
            constraints="Zero external debt capacity; strictly self-funded working capital; maximum 6-month payback requirement.",
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
                currency="USD",
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
    biz2 = db.query(Business).filter(Business.name == "Nova Data Analytics [SAMPLE]").first()
    if not biz2:
        biz2 = Business(
            name="Nova Data Analytics [SAMPLE]",
            industry="Enterprise B2B Software",
            location="Austin, Texas",
            currency="USD",
            description="B2B software startup providing automated data pipeline monitoring and observability dashboards for mid-market retailers.",
            goals="Evaluate whether to launch an automated AI predictive forecasting add-on module vs. focusing purely on core platform stability.",
            constraints="Engineering capacity is capped at 6 developers; AWS cloud budget must not exceed $20,000/month before revenue validation.",
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
                currency="USD",
                description=str(row["Description"])
            ))
        db.commit()

    # Scenario 3: Expansion Decision (Lumina Retail & Home)
    biz3 = db.query(Business).filter(Business.name == "Lumina Home Goods [SAMPLE]").first()
    if not biz3:
        biz3 = Business(
            name="Lumina Home Goods [SAMPLE]",
            industry="Home & Lifestyle Retail",
            location="Seattle, Washington",
            currency="USD",
            description="Specialty home goods and lighting brand weighing two expansion avenues: opening 2 new physical retail stores in secondary metros vs. heavily scaling direct-to-consumer digital channels.",
            goals="Determine the highest risk-adjusted ROI pathway between physical brick-and-mortar leases vs digital national e-commerce scale.",
            constraints="Total expansion capital capped at $150,000 over 12 months; cannot support simultaneous lease commitments and national advertising.",
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
                currency="USD",
                description=str(row["Description"])
            ))
        db.commit()

    return [biz1.id, biz2.id, biz3.id]
