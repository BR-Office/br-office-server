# PKT-0094: direct part of the x2t differential oracle. Runs the original and the new x2t (two mirror bin dirs)
# on the same inputs in the directions the server uses, interleaved (original, new, original, new...) so VM load
# drift hits both sides, and compares the outputs BY CONTENT:
#   bin (Editor.bin, what the editor opens): sha1 of the bytes;
#   OOXML / ODF (zip): per-entry sha1 of the XML with volatile fields removed (rsids, dates, revision, generator);
#   PDF: page count + sha1 of the whitespace-normalized pdftotext output.
# Usage: python3 -I x2t-direct.py <orig-bin> <new-bin> <runs> <intended-file> <input>...
#        python3 -I x2t-direct.py --fingerprint <file>
# Prints "same|DIFF|INTENDED <case> <direction> ..." and one "timing" line per case (median ms per direction).
# Intended: "<case> <direction>" per line in the intended file. Exit 1 on an unintended difference.
import hashlib, os, re, shutil, statistics, subprocess, sys, tempfile, time, zipfile
ob, nb, runs, intended_file, *inputs = (sys.argv[1:] + [0, 0, 0])[:max(4, len(sys.argv) - 1)]
FMT = {'docx': 65, 'xlsx': 257, 'pptx': 129, 'odt': 67, 'ods': 259, 'odp': 131, 'pdf': 513, 'bin': 8192}
ODF = {'docx': 'odt', 'xlsx': 'ods', 'pptx': 'odp'}
intended = set()
if os.path.exists(intended_file):
    for l in open(intended_file):
        l = l.split('#')[0].split()
        if l: intended.add(' '.join(l[:2]))
VOLATILE = [rb'\s(w|w14|w15):(rsid\w*|paraId|textId)="[^"]*"', rb'<w:rsids>.*?</w:rsids>', rb'<w:rsid [^>]*/>',
            rb'<dcterms:(created|modified)[^>]*>[^<]*</dcterms:\w+>', rb'<cp:revision>[^<]*</cp:revision>',
            rb'<meta:(creation-date|generator|editing-duration|editing-cycles)>[^<]*</meta:[\w-]+>',
            rb'<dc:date>[^<]*</dc:date>', rb'(?<=:cNvPr) id="\d+"', rb'(?<=:fld) id="\{[0-9A-F-]+\}"',  # random ids from the editor
            rb'<Application>[^<]*</Application>', rb'<AppVersion>[^<]*</AppVersion>']

def x2t(bindir, src, dst, fmt, tmp):
    xml = os.path.join(tmp, 'params.xml')
    with open(xml, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?><TaskQueueDataConvert>'
                f'<m_sFileFrom>{src}</m_sFileFrom><m_sFileTo>{dst}</m_sFileTo><m_nFormatTo>{fmt}</m_nFormatTo>'
                f'<m_sFontDir>/usr/share/fonts</m_sFontDir><m_sAllFontsPath>{bindir}/AllFonts.js</m_sAllFontsPath>'
                f'<m_bIsNoBase64>false</m_bIsNoBase64><m_sTempDir>{tmp}</m_sTempDir></TaskQueueDataConvert>')
    t0 = time.perf_counter()
    code = subprocess.run([os.path.join(bindir, 'x2t'), xml], cwd=bindir, timeout=900,
                          env={**os.environ, 'LD_LIBRARY_PATH': bindir},
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode
    return code, (time.perf_counter() - t0) * 1000

def fingerprint(path):
    if not os.path.isfile(path): return 'missing'
    h = lambda b: hashlib.sha1(b).hexdigest()[:12]
    if path.endswith('.pdf'):
        pages = re.search(r'^Pages:\s+(\d+)', subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout, re.M)
        text = ' '.join(subprocess.run(['pdftotext', '-enc', 'UTF-8', path, '-'], capture_output=True, text=True).stdout.split())
        return f'pages={pages.group(1) if pages else "?"} text={h(text.encode())} chars={len(text)}'
    if zipfile.is_zipfile(path):
        out = []
        with zipfile.ZipFile(path) as z:
            for n in sorted(z.namelist()):
                b = z.read(n)
                if n.endswith(('.xml', '.rels')):
                    for v in VOLATILE: b = re.sub(v, b'', b, flags=re.S)
                out.append(f'{n}:{h(b)}')
        return ' '.join(out)
    return h(open(path, 'rb').read())

if sys.argv[1] == '--fingerprint':  # used by x2t-run.cjs for saved/converted files
    print(fingerprint(sys.argv[2])); sys.exit(0)
runs = int(runs); bad = 0
for src in map(os.path.abspath, inputs):
    ext = src.rsplit('.', 1)[1]; case = os.path.basename(src)
    dirs = [('open', None, 'bin'), ('save', 'open', ext), ('own', None, ext), ('pdf', None, 'pdf'), ('odf', None, ODF[ext])]
    times = {s: {d[0]: [] for d in dirs} for s in ('original', 'new')}
    fps = {}
    tmp = tempfile.mkdtemp(prefix='x2t-diff-')
    try:
        for k in range(runs):
            for side, bindir in (('original', ob), ('new', nb)):
                outs = {}
                for name, frm, to in dirs:
                    sub = tempfile.mkdtemp(dir=tmp); dst = os.path.join(sub, 'out.' + to)
                    s = outs.get(frm, src) if frm else src
                    code, ms = x2t(bindir, s, dst, FMT[to], sub)
                    outs[name] = dst; times[side][name].append(ms)
                    if k == 0: fps[(side, name)] = f'exit={code} {fingerprint(dst)}'
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    for name, _, _ in dirs:
        o, n = fps[('original', name)], fps[('new', name)]
        if not o.startswith('exit=0 ') or 'missing' in o:
            bad += 1; print(f'ERROR {case} {name}: original side produced no output ({o})'); continue
        if o == n: print(f'same {case} {name} ({o[:60]})'); continue
        ok = f'{case} {name}' in intended; bad += not ok
        print(f'{"INTENDED" if ok else "DIFF"} {case} {name}\n  original: {o[:600]}\n  new:      {n[:600]}')
    fmt = lambda s: ' '.join(f'{d}={statistics.median(v):.0f}' for d, v in times[s].items())
    print(f'timing x2t-direct {case} (median of {runs} ms) | original {fmt("original")} | new {fmt("new")}', flush=True)
print(f'x2t-direct: {"FAIL, %d unintended difference(s)" % bad if bad else "PASS"}')
sys.exit(1 if bad else 0)
