# Realistic large samples for the PKT-0018 load and convert runs (not committed; regenerate with this script).
# Usage: python3 .theseus/oracle/perf/make-samples.py <out-dir>
# Writes: big-300p.docx (300 pages of text, tables and 60 photos-like JPEGs), big-50k.xlsx (50 000 rows x 8 columns,
# formulas on every row, 3 sheets), big-80s.pptx (80 slides, a JPEG and a table on each).
import io, os, random, sys
from PIL import Image
from docx import Document
from docx.shared import Inches
from openpyxl import Workbook
from pptx import Presentation
from pptx.util import Inches as PI

out = sys.argv[1]; os.makedirs(out, exist_ok=True); random.seed(18)
WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split()
para = lambda n: ' '.join(random.choice(WORDS) for _ in range(n)).capitalize() + '.'

def jpeg(w=1200, h=800):
    # Noisy gradient: compresses like a photo (~150-250 KB), unlike a flat colour.
    im = Image.effect_noise((w, h), 60).convert('RGB')
    im = Image.blend(im, Image.linear_gradient('L').resize((w, h)).convert('RGB'), 0.5)
    b = io.BytesIO(); im.save(b, 'JPEG', quality=80); b.seek(0); return b

d = Document()
for p in range(300):
    d.add_heading(f'Section {p + 1}', level=2)
    for _ in range(4): d.add_paragraph(para(60))
    if p % 5 == 0: d.add_picture(jpeg(), width=Inches(5))
    if p % 3 == 0:
        t = d.add_table(rows=6, cols=4); t.style = 'Table Grid'
        for r in t.rows:
            for c in r.cells: c.text = para(3)
    d.add_page_break()
d.save(os.path.join(out, 'big-300p.docx'))

wb = Workbook()
for s in range(3):
    ws = wb.active if s == 0 else wb.create_sheet()
    ws.title = f'Data{s + 1}'; ws.append(['id', 'name', 'qty', 'price', 'total', 'tax', 'gross', 'running'])
    for i in range(2, 50002 if s == 0 else 10002):
        ws.append([i - 1, random.choice(WORDS), random.randint(1, 99), round(random.random() * 100, 2),
                   f'=C{i}*D{i}', f'=E{i}*0.21', f'=E{i}+F{i}', f'=SUM(G$2:G{i})' if i < 2000 else f'=H{i - 1}+G{i}'])
wb.save(os.path.join(out, 'big-50k.xlsx'))

pr = Presentation()
for s in range(80):
    sl = pr.slides.add_slide(pr.slide_layouts[5]); sl.shapes.title.text = f'Slide {s + 1}: ' + para(4)
    sl.shapes.add_picture(jpeg(800, 600), PI(0.5), PI(1.5), width=PI(4.5))
    t = sl.shapes.add_table(5, 3, PI(5.2), PI(1.5), PI(4.3), PI(3)).table
    for r in range(5):
        for c in range(3): t.cell(r, c).text = para(2)
pr.save(os.path.join(out, 'big-80s.pptx'))
for f in sorted(os.listdir(out)): print(f, os.path.getsize(os.path.join(out, f)))
