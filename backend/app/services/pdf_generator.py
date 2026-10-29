import io
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_meeting_pdf(meeting, business, messages, recommendations, tasks, metrics=None) -> bytes:
    """
    Generates a polished, executive-ready PDF meeting report using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0F172A") # Slate 900
    brand_blue = colors.HexColor("#2563EB") # Blue 600
    subtext_color = colors.HexColor("#475569") # Slate 600
    border_color = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=6
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=brand_blue,
        spaceBefore=8,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=primary_color
    )

    meta_style = ParagraphStyle(
        'Meta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=subtext_color
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.whitesmoke
    )

    elements = []

    # Title & Metadata
    elements.append(Paragraph("BOARDROOM EXECUTIVE STRATEGY REPORT", title_style))
    sample_tag = " [SAMPLE DEMO]" if business.is_sample else ""
    elements.append(Paragraph(f"<b>Business:</b> {business.name}{sample_tag} | <b>Industry:</b> {business.industry} | <b>Currency:</b> {business.currency}", meta_style))
    meeting_date = meeting.started_at.strftime('%Y-%m-%d %H:%M UTC') if meeting.started_at else datetime.utcnow().strftime('%Y-%m-%d')
    elements.append(Paragraph(f"<b>Date:</b> {meeting_date} | <b>Meeting ID:</b> {meeting.id[:8]} | <b>Status:</b> {meeting.status.upper()}", meta_style))
    elements.append(Spacer(1, 10))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceBefore=4, spaceAfter=12))

    # Strategic Question
    elements.append(Paragraph("STRATEGIC QUESTION ADDRESSED", h1_style))
    q_table = Table(
        [[Paragraph(f"<b>\"{meeting.question}\"</b>", ParagraphStyle('QStyle', parent=body_style, fontSize=10, leading=14, fontName='Helvetica-BoldOblique'))]],
        colWidths=[532]
    )
    q_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 10),
    ]))
    elements.append(q_table)
    elements.append(Spacer(1, 12))

    # Financial Grounding Snapshot
    if metrics:
        elements.append(Paragraph("EVIDENCE & FINANCIAL GROUNDING SNAPSHOT", h1_style))
        margin_str = f"{metrics.operating_margin_percent}%" if metrics.operating_margin_percent is not None else "N/A"
        cur = "INR" if business.currency == "INR" else business.currency
        fin_data = [
            [
                Paragraph(f"<b>Total Revenue:</b> {cur} {metrics.total_revenue:,.2f}", body_style),
                Paragraph(f"<b>Total Expenses:</b> {cur} {metrics.total_expenses:,.2f}", body_style),
                Paragraph(f"<b>Net Operating Result:</b> {cur} {metrics.net_operating_result:,.2f}", body_style),
                Paragraph(f"<b>Op. Margin:</b> {margin_str}", body_style)
            ]
        ]
        fin_table = Table(fin_data, colWidths=[133, 133, 133, 133])
        fin_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
            ('PADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(fin_table)
        elements.append(Spacer(1, 10))

    # Market Intelligence & Strategic Benchmarks (Tavily)
    if getattr(meeting, "market_research_json", None):
        try:
            mr = json.loads(meeting.market_research_json)
            if mr.get("summary") or mr.get("sources"):
                elements.append(Paragraph("LIVE MARKET INTELLIGENCE & BENCHMARKS (TAVILY)", h1_style))
                mr_summary = mr.get("summary", "")
                elements.append(Paragraph(f"<b>Market Dynamics:</b> {mr_summary}", body_style))
                elements.append(Spacer(1, 4))
                sources = mr.get("sources", [])
                if sources:
                    source_lines = ["<b>Referenced Market Sources:</b>"]
                    for s in sources[:3]:
                        source_lines.append(f"• <b>{s.get('title')}:</b> {s.get('content', '')[:180]} (<i>{s.get('url')}</i>)")
                    elements.append(Paragraph("<br/>".join(source_lines), meta_style))
                elements.append(Spacer(1, 10))
        except Exception:
            pass

    # CEO Synthesis & Final Decision (if present)
    if meeting.synthesis_json:
        try:
            synthesis = json.loads(meeting.synthesis_json)
            elements.append(Paragraph("EXECUTIVE SYNTHESIS & FINAL RECOMMENDATION", h1_style))
            
            rec_text = synthesis.get("final_recommendation", "")
            justification = synthesis.get("justification", "")
            confidence = synthesis.get("confidence_statement", "")

            summary_data = [
                [Paragraph("<b>Consolidated Decision</b>", h2_style)],
                [Paragraph(f"<b>{rec_text}</b>", body_style)],
                [Paragraph("<b>Decision Rationale:</b> " + justification, body_style)],
                [Paragraph("<b>Confidence Assessment:</b> " + confidence, meta_style)]
            ]
            sum_table = Table(summary_data, colWidths=[532])
            sum_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
                ('BOX', (0,0), (-1,-1), 1, brand_blue),
                ('PADDING', (0,0), (-1,-1), 8),
            ]))
            elements.append(sum_table)
            elements.append(Spacer(1, 10))

            # Minority Dissent & Known Uncertainties
            dissent = synthesis.get("preserved_minority_dissent", [])
            limitations = synthesis.get("known_limitations_and_uncertainties", [])
            if dissent or limitations:
                dissent_text = "<b>Preserved Minority Concerns & Counter-points:</b><br/>" + "<br/>• ".join(dissent) if dissent else ""
                limit_text = "<b>Known Limitations & Unverified Assumptions:</b><br/>" + "<br/>• ".join(limitations) if limitations else ""
                dis_table = Table(
                    [[Paragraph(f"{dissent_text}<br/><br/>{limit_text}".strip(), body_style)]],
                    colWidths=[532]
                )
                dis_table.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FEF3C7")),
                    ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#F59E0B")),
                    ('PADDING', (0,0), (-1,-1), 8),
                ]))
                elements.append(dis_table)
                elements.append(Spacer(1, 12))
        except Exception:
            pass

    # Executive Debate Log
    elements.append(Paragraph("EXECUTIVE CONTRIBUTIONS & DEBATE TRANSCRIPT", h1_style))
    for msg in messages:
        exec_name = msg.executive.upper()
        stage_name = msg.stage.replace("_", " ").title()
        
        # Parse evidence, assumptions, risks if available
        meta_extra = []
        try:
            evs = json.loads(msg.evidence_refs_json or "[]")
            if evs:
                meta_extra.append(f"<b>Evidence:</b> {len(evs)} citations")
        except Exception:
            pass

        try:
            assumps = json.loads(msg.assumptions_json or "[]")
            if assumps:
                meta_extra.append(f"<b>Assumptions:</b> {len(assumps)} labeled")
        except Exception:
            pass

        extra_str = " | ".join(meta_extra)
        if extra_str:
            extra_str = f" ({extra_str})"

        elements.append(Paragraph(f"<b>{exec_name}</b> — <i>Stage: {stage_name}</i>{extra_str}", h2_style))
        # Format paragraphs
        formatted_content = msg.content.replace("\n", "<br/>")
        elements.append(Paragraph(formatted_content, body_style))
        elements.append(Spacer(1, 6))

    # Actionable Tasks
    if tasks:
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("PRIORITIZED ACTION PLAN", h1_style))
        task_rows = [
            [
                Paragraph("<b>Priority</b>", meta_style),
                Paragraph("<b>Task Title & Scope</b>", meta_style),
                Paragraph("<b>Owner</b>", meta_style),
                Paragraph("<b>Target Success Metric</b>", meta_style),
                Paragraph("<b>Status</b>", meta_style)
            ]
        ]
        for t in tasks:
            task_rows.append([
                Paragraph(t.priority.upper(), body_style),
                Paragraph(f"<b>{t.title}</b><br/>{t.description or ''}", body_style),
                Paragraph(t.owner or "Unassigned", body_style),
                Paragraph(t.success_metric or "-", body_style),
                Paragraph(t.status.upper(), body_style)
            ])
        task_table = Table(task_rows, colWidths=[55, 210, 85, 122, 60])
        task_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
            ('BOX', (0,0), (-1,-1), 0.5, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        elements.append(task_table)

    # Disclaimer Footer
    elements.append(Spacer(1, 20))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=border_color, spaceBefore=4, spaceAfter=6))
    elements.append(Paragraph(
        "<b>Notice:</b> This report was compiled by the Gemini AI Virtual Executive Boardroom agent for strategic evaluation. "
        "Calculations are computed deterministically from ingested data. Facts, explicit assumptions, and recommendations are distinct. "
        "Corporate governance, regulatory compliance, and contractual execution remain the sole responsibility of business leadership.",
        meta_style
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
