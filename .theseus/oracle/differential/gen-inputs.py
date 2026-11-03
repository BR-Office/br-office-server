# PKT-0095: deterministic inputs for the sdkjs differential oracle. Usage: python3 gen-inputs.py <out-dir>
import os, sys, random
import docx, pptx
from docx.shared import Pt
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Inches
out = sys.argv[1]; os.makedirs(out, exist_ok=True); random.seed(95)
W = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore'.split()
def para(n): return ' '.join(random.choice(W) for _ in range(n)).capitalize() + '.'

d = docx.Document()  # text: headings, styled runs, lists, a table, ~4 pages
for s in range(6):
    d.add_heading(f'Section {s + 1}', 1)
    for i in range(5):
        p = d.add_paragraph(para(40)); r = p.add_run(' Bold tail.'); r.bold = True; r.font.size = Pt(13)
    d.add_paragraph(para(8), style='List Bullet')
t = d.add_table(rows=4, cols=3); t.style = 'Table Grid'
for i, c in enumerate(t._cells): c.text = f'cell {i}'
d.save(os.path.join(out, 'text.docx'))

d = docx.Document()  # styles: many paragraph styles, page-sized content (style cache paths)
for i in range(60):
    d.add_paragraph(para(25), style=['Normal', 'Heading 2', 'Quote', 'List Number', 'Intense Quote'][i % 5])
d.save(os.path.join(out, 'styles.docx'))

pr = pptx.Presentation()  # shapes: title/body placeholders and autoshapes with text
for s in range(5):
    sl = pr.slides.add_slide(pr.slide_layouts[1]); sl.shapes.title.text = f'Slide {s + 1}'
    sl.placeholders[1].text = para(12)
    sh = sl.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6), Inches(5), Inches(3), Inches(1.5)); sh.text = para(5)
pr.save(os.path.join(out, 'shapes.pptx'))

pr = pptx.Presentation()  # chart: a column and a pie chart next to a text box
sl = pr.slides.add_slide(pr.slide_layouts[5]); sl.shapes.title.text = 'Charts'
cd = CategoryChartData(); cd.categories = ['Q1', 'Q2', 'Q3', 'Q4']
cd.add_series('A', (1.5, 2.5, 3.5, 2.0)); cd.add_series('B', (2.0, 1.0, 4.0, 3.0))
sl.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.5), Inches(1.5), Inches(4.5), Inches(4), cd)
sl.shapes.add_chart(XL_CHART_TYPE.PIE, Inches(5), Inches(1.5), Inches(4.5), Inches(4), cd)
sl = pr.slides.add_slide(pr.slide_layouts[1]); sl.shapes.title.text = 'Notes'; sl.placeholders[1].text = para(10)
pr.save(os.path.join(out, 'chart.pptx'))
