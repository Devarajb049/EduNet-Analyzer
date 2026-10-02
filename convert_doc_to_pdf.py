import os
import re
import html
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether, PageBreak, Preformatted
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress on cover page

        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#1E3A8A"))
        self.drawString(45, letter[1] - 30, "EduNet Analyzer")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(110, letter[1] - 30, "— Project Flow & Working Documentation")
        self.drawRightString(letter[0] - 45, letter[1] - 30, "NS-2 Simulation & Telemetry Platform")

        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(45, letter[1] - 34, letter[0] - 45, letter[1] - 34)

        # Footer
        self.line(45, 40, letter[0] - 45, 40)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(45, 28, "Computer Networks & Internet Protocols Laboratory | Academic Year 2025–2026")
        self.drawRightString(letter[0] - 45, 28, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def clean_inline_markdown(text):
    """Converts inline markdown (bold, italic, code, math) to ReportLab XML tags."""
    if not text:
        return ""

    # Replace math expressions
    text = text.replace(r"\text{Throughput}", "Throughput")
    text = text.replace(r"\text{PDR}", "PDR")
    text = text.replace(r"\text{Loss}", "Loss")
    text = text.replace(r"\text{Delay}", "Delay")
    text = text.replace(r"\times", "&times;")
    text = text.replace(r"\sum", "&Sigma;")
    text = text.replace(r"\ge", "&ge;")
    text = text.replace(r"\le", "&le;")
    text = text.replace(r"\in", "&isin;")
    text = text.replace(r"\dots", "...")
    text = text.replace(r"\longleftrightarrow", "&harr;")
    text = text.replace(r"\leftrightarrow", "&harr;")
    text = text.replace(r"\longrightarrow", "&rarr;")
    text = text.replace(r"\rightarrow", "&rarr;")
    text = text.replace(r"\quad", "  ")
    text = re.sub(r'\\frac\{([^}]+)\}\{([^}]+)\}', r'(\1 / \2)', text)
    text = re.sub(r'\$\$([^$]+)\$\$', r'<b>\1</b>', text)
    text = re.sub(r'\$([^$]+)\$', r'<i>\1</i>', text)

    # Inline code: `code`
    text = re.sub(r'`([^`]+)`', r'<font face="Courier" color="#1E3A8A"><b>\1</b></font>', text)

    # Bold: **bold** or __bold__
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'__([^_]+)__', r'<b>\1</b>', text)

    # Italic: *italic* or _italic_
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)

    # Links: [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'<font color="#2563EB"><u>\1</u></font>', text)

    # Clean unescaped ampersands that aren't entities
    text = re.sub(r'&(?!(?:amp|lt|gt|quot|apos|times|Sigma|ge|le|isin|rarr|harr);)', '&amp;', text)

    return text

def parse_markdown_to_pdf(md_file_path, output_pdf_path):
    with open(md_file_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()

    c_primary = colors.HexColor("#1E3A8A")
    c_blue = colors.HexColor("#2563EB")
    c_dark = colors.HexColor("#0F172A")
    c_muted = colors.HexColor("#475569")
    c_border = colors.HexColor("#CBD5E1")

    h1_style = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=c_dark,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h3_style = ParagraphStyle(
        'DocH3',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=c_blue,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12.5,
        textColor=c_dark,
        spaceAfter=4
    )

    bullet_style = ParagraphStyle(
        'DocBullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )

    callout_style = ParagraphStyle(
        'DocCallout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E40AF")
    )

    code_block_style = ParagraphStyle(
        'DocCodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor("#0F172A"),
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#FFFFFF")
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=c_dark
    )

    story = []

    # Process line by line with state tracking
    lines = md_text.splitlines()
    i = 0
    total_lines = len(lines)

    in_code_block = False
    code_block_content = []
    code_block_lang = ""

    in_table = False
    table_rows = []

    in_blockquote = False
    blockquote_lines = []

    printable_width = letter[0] - 90  # 612 - 90 = 522 pt

    while i < total_lines:
        line = lines[i]

        # 1. Code Block delimiters: ```
        if line.strip().startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_block_lang = line.strip()[3:].strip()
                code_block_content = []
            else:
                in_code_block = False
                # Emit preformatted code block box
                raw_code = "\n".join(code_block_content)
                # Escape html in code
                raw_code = html.escape(raw_code)
                pre = Preformatted(raw_code, code_block_style)

                code_box = Table([[pre]], colWidths=[printable_width])
                code_box.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                    ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 8),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ]))
                story.append(code_box)
                story.append(Spacer(1, 4))
            i += 1
            continue

        if in_code_block:
            code_block_content.append(line)
            i += 1
            continue

        # 2. Blockquote: > line
        if line.strip().startswith(">"):
            in_blockquote = True
            bq_text = line.strip()[1:].strip()
            blockquote_lines.append(bq_text)
            i += 1
            # Check if next line is also blockquote
            if i < total_lines and lines[i].strip().startswith(">"):
                continue
            else:
                # Flush blockquote
                in_blockquote = False
                full_bq = " ".join(blockquote_lines)
                clean_bq = clean_inline_markdown(full_bq)
                p_bq = Paragraph(clean_bq, callout_style)
                bq_table = Table([[p_bq]], colWidths=[printable_width])
                bq_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#BFDBFE")),
                    ('TOPPADDING', (0, 0), (-1, -1), 6),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                    ('LEFTPADDING', (0, 0), (-1, -1), 10),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ]))
                story.append(bq_table)
                story.append(Spacer(1, 4))
                blockquote_lines = []
            continue

        # 3. Markdown Tables: | col1 | col2 |
        if line.strip().startswith("|") and line.strip().endswith("|"):
            in_table = True
            raw_cells = [c.strip() for c in line.strip().split("|")[1:-1]]
            # Check if this is the separator row: | :--- | :--- |
            if all(re.match(r'^:?-+:?$', c) for c in raw_cells):
                i += 1
                continue
            table_rows.append(raw_cells)
            i += 1
            # Check if next line continues table
            if i < total_lines and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                continue
            else:
                # Flush Table
                in_table = False
                if table_rows:
                    num_cols = max(len(r) for r in table_rows)
                    # Normalize rows
                    for r in table_rows:
                        while len(r) < num_cols:
                            r.append("")

                    # Calculate col widths
                    col_width = printable_width / num_cols
                    col_widths = [col_width] * num_cols

                    formatted_table_data = []
                    for row_idx, r in enumerate(table_rows):
                        row_paras = []
                        is_header = (row_idx == 0)
                        st = table_header_style if is_header else table_cell_style
                        for cell in r:
                            clean_cell = clean_inline_markdown(cell)
                            row_paras.append(Paragraph(clean_cell, st))
                        formatted_table_data.append(row_paras)

                    t = Table(formatted_table_data, colWidths=col_widths)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
                        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                        ('TOPPADDING', (0, 0), (-1, -1), 3),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                        ('LEFTPADDING', (0, 0), (-1, -1), 4),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ]))
                    story.append(t)
                    story.append(Spacer(1, 4))
                table_rows = []
            continue

        # 4. Horizontal Rule: ---
        if line.strip() in ("---", "***", "___"):
            story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#CBD5E1"), spaceBefore=6, spaceAfter=6))
            i += 1
            continue

        # 5. Headings
        if line.startswith("# "):
            clean_title = clean_inline_markdown(line[2:].strip())
            story.append(Spacer(1, 6))
            story.append(Paragraph(clean_title, h1_style))
            i += 1
            continue

        if line.startswith("## "):
            clean_title = clean_inline_markdown(line[3:].strip())
            story.append(Spacer(1, 4))
            story.append(Paragraph(clean_title, h2_style))
            i += 1
            continue

        if line.startswith("### "):
            clean_title = clean_inline_markdown(line[4:].strip())
            story.append(Paragraph(clean_title, h3_style))
            i += 1
            continue

        # 6. Bullet lists: - item, * item
        if line.strip().startswith("- ") or line.strip().startswith("* "):
            bullet_text = line.strip()[2:].strip()
            clean_b = clean_inline_markdown(bullet_text)
            story.append(Paragraph(f"&bull;  {clean_b}", bullet_style))
            i += 1
            continue

        # Numbered list: 1. item
        m_num = re.match(r'^(\d+\.)\s+(.+)$', line.strip())
        if m_num:
            prefix = m_num.group(1)
            num_text = clean_inline_markdown(m_num.group(2))
            story.append(Paragraph(f"<b>{prefix}</b> {num_text}", bullet_style))
            i += 1
            continue

        # 7. Blank lines
        if not line.strip():
            story.append(Spacer(1, 3))
            i += 1
            continue

        # 8. Standard paragraph
        clean_para = clean_inline_markdown(line.strip())
        if clean_para:
            story.append(Paragraph(clean_para, body_style))
        i += 1

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[COMPLETE] Rendered full markdown to PDF: {output_pdf_path}")

if __name__ == "__main__":
    src_md = os.path.join(os.path.dirname(os.path.abspath(__file__)), "EduNet_Analyzer_Project_Flow_and_Working_Documentation.md")
    dst_pdf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "EduNet_Analyzer_Project_Flow_and_Working_Documentation.pdf")
    parse_markdown_to_pdf(src_md, dst_pdf)
