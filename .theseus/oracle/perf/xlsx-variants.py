# PKT-0054: xlsx variants that isolate what drives xlsx -> pdf cost in x2t.
# Usage: python3 .theseus/oracle/perf/xlsx-variants.py <out-dir>; then x2t-split.sh on each output.
#   v-formulas.xlsx   = big-50k shape (50k + 2x10k rows, 8 cols, formulas, no cached values)
#   v-values.xlsx     = same cells, literal values only (no formulas)
#   v-1sheet-50k.xlsx = sheet 1 only, values
#   v-1sheet-25k.xlsx = sheet 1 only, 25k rows, values (scaling)
#   v-fit.xlsx        = v-1sheet-50k with fitToWidth=1 / fitToHeight=0 (page setup)
#   v-numbers.xlsx    = sheet 1, 50k rows, only numbers (no text cells)
import os, random, sys
from openpyxl import Workbook
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
W = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor'.split()
def build(name, sheets, formulas=True, fit=False, text=True):
    random.seed(18); wb = Workbook()
    for s, n in enumerate(sheets):
        ws = wb.active if s == 0 else wb.create_sheet(); ws.title = f'Data{s+1}'
        ws.append(['id', 'name', 'qty', 'price', 'total', 'tax', 'gross', 'running'])
        run = 0
        for i in range(2, n + 2):
            q, p = random.randint(1, 99), round(random.random() * 100, 2); t = q * p; g = t * 1.21; run += g
            nm = random.choice(W) if text else i * 7
            if formulas:
                ws.append([i-1, nm, q, p, f'=C{i}*D{i}', f'=E{i}*0.21', f'=E{i}+F{i}',
                           f'=SUM(G$2:G{i})' if i < 2000 else f'=H{i-1}+G{i}'])
            else:
                ws.append([i-1, nm, q, p, round(t, 2), round(t*.21, 2), round(g, 2), round(run, 2)])
        if fit:
            ws.sheet_properties.pageSetUpPr.fitToPage = True; ws.page_setup.fitToWidth = 1; ws.page_setup.fitToHeight = 0
    wb.save(os.path.join(out, name))
build('v-formulas.xlsx', [50000, 10000, 10000])
build('v-values.xlsx', [50000, 10000, 10000], formulas=False)
build('v-1sheet-50k.xlsx', [50000], formulas=False)
build('v-1sheet-25k.xlsx', [25000], formulas=False)
build('v-fit.xlsx', [50000], formulas=False, fit=True)
build('v-numbers.xlsx', [50000], formulas=False, text=False)
for f in sorted(os.listdir(out)): print(f, os.path.getsize(os.path.join(out, f)))
