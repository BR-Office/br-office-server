#!/usr/bin/env python3
# Small text-bearing corpus for corpus.py (PKT-0042): the empty templates have no text, so PDF text checks need these.
# Deterministic (fixed seed). Usage: python3 .theseus/oracle/x2t/make-corpus.py <out-dir>
import os, random, sys
from docx import Document
from openpyxl import Workbook
from pptx import Presentation
from pptx.util import Inches

out = sys.argv[1]; os.makedirs(out, exist_ok=True); random.seed(42)
W = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau'.split()
para = lambda n: ' '.join(random.choice(W) for _ in range(n)).capitalize() + '.'

d = Document()
for p in range(10):
    d.add_heading(f'Chapter {p + 1}', level=1)
    for _ in range(6): d.add_paragraph(para(50))
    t = d.add_table(rows=4, cols=3); t.style = 'Table Grid'
    for i, r in enumerate(t.rows):
        for j, c in enumerate(r.cells): c.text = f'r{i}c{j}'
    d.add_page_break()
d.save(os.path.join(out, 'text-10p.docx'))

wb = Workbook(); ws = wb.active; ws.title = 'Data'
ws.append(['id', 'name', 'qty', 'price', 'total'])
for i in range(1, 501):
    ws.append([i, random.choice(W), random.randint(1, 99), round(random.uniform(1, 100), 2), f'=C{i + 1}*D{i + 1}'])
wb.create_sheet('Summary').append(['sum', '=SUM(Data!E2:E501)'])
wb.save(os.path.join(out, 'rows-500.xlsx'))

pr = Presentation()
for s in range(12):
    sl = pr.slides.add_slide(pr.slide_layouts[1])
    sl.shapes.title.text = f'Slide {s + 1}'
    sl.placeholders[1].text = '\n'.join(para(8) for _ in range(4))
    tb = sl.shapes.add_table(2, 3, Inches(1), Inches(5.5), Inches(6), Inches(1)).table
    for i in range(2):
        for j in range(3): tb.cell(i, j).text = f's{s}r{i}c{j}'
pr.save(os.path.join(out, 'slides-12.pptx'))
