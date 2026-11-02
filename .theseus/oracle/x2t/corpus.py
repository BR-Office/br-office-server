#!/usr/bin/env python3
# x2t corpus oracle (PKT-0042, plan x2t P2). Runs the installed x2t over a corpus in the directions the server uses
# and records, per (file, direction): exit code, output size, and for PDF the page count and a hash of the
# whitespace-normalized extracted text (PDF bytes are not stable: dates, ids). Compare a later build to a baseline.
#
# Usage:
#   python3 .theseus/oracle/x2t/corpus.py run  [--corpus DIR ...] [--x2t BINDIR] > result.json
#   python3 .theseus/oracle/x2t/corpus.py diff baseline.json result.json       # exit 1 on any difference
# Default corpus: the en-US new.* templates of the installed package. Add the PKT-0016/PKT-0018 samples with
# --corpus <dir> (regenerate them with .theseus/oracle/perf/make-samples.py).
# Baseline: baseline-9.3.7-1.json = en-US templates + make-corpus.py output (dir "corpus"), native package
# euro-office-documentserver 9.3.7-1; two runs gave identical results.
# Directions: open (-> Editor.bin, 8192), save (Editor.bin -> own OOXML, as the server assembles a save),
# own (OOXML -> own OOXML), pdf, odf. Needs pdfinfo and pdftotext (poppler-utils).
import argparse, hashlib, json, os, re, shutil, subprocess, sys, tempfile

X2T = '/var/www/euro-office/documentserver/server/FileConverter/bin'
TEMPLATES = '/var/www/euro-office/documentserver/document-templates/new/en-US'
# AVS_OFFICESTUDIO_FILE_* codes (core/Common/OfficeFileFormats.h).
FMT = {'docx': 65, 'xlsx': 257, 'pptx': 129, 'odt': 67, 'ods': 259, 'odp': 131, 'pdf': 513, 'bin': 8192}
ODF = {'docx': 'odt', 'xlsx': 'ods', 'pptx': 'odp'}

def x2t(bindir, src, dst, fmt, tmp):
    xml = os.path.join(tmp, 'params.xml')
    with open(xml, 'w') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?><TaskQueueDataConvert>'
                f'<m_sFileFrom>{src}</m_sFileFrom><m_sFileTo>{dst}</m_sFileTo><m_nFormatTo>{fmt}</m_nFormatTo>'
                f'<m_sFontDir>/usr/share/fonts</m_sFontDir><m_sAllFontsPath>{bindir}/AllFonts.js</m_sAllFontsPath>'
                f'<m_bIsNoBase64>false</m_bIsNoBase64><m_sTempDir>{tmp}</m_sTempDir></TaskQueueDataConvert>')
    try:
        code = subprocess.run([os.path.join(bindir, 'x2t'), xml], cwd=bindir, timeout=900,
                              env={**os.environ, 'LD_LIBRARY_PATH': bindir},
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode
    except subprocess.TimeoutExpired:
        code = 'timeout'
    row = {'exit': code, 'size': os.path.getsize(dst) if os.path.isfile(dst) else 0}
    if fmt == FMT['pdf'] and row['size']:
        info = subprocess.run(['pdfinfo', dst], capture_output=True, text=True).stdout
        m = re.search(r'^Pages:\s+(\d+)', info, re.M)
        row['pages'] = int(m.group(1)) if m else None
        text = ' '.join(subprocess.run(['pdftotext', '-enc', 'UTF-8', dst, '-'], capture_output=True, text=True).stdout.split())
        row['textChars'] = len(text)
        row['textSha1'] = hashlib.sha1(text.encode()).hexdigest()
        row['textHead'] = text[:120]
    return row

def run(args):
    files = sorted(os.path.join(d, f) for d in args.corpus for f in os.listdir(d)
                   if os.path.splitext(f)[1][1:] in ODF)
    out = {'x2t': args.x2t, 'results': {}}
    for src in files:
        ext = os.path.splitext(src)[1][1:]
        key = os.path.basename(os.path.dirname(src)) + '/' + os.path.basename(src)
        res = out['results'][key] = {'inputSize': os.path.getsize(src)}
        tmp = tempfile.mkdtemp(prefix='x2t-corpus-')
        try:
            def conv(name, s, to_ext, fmt):
                sub = tempfile.mkdtemp(dir=tmp)
                dst = os.path.join(sub, 'out.' + to_ext)
                res[name] = x2t(args.x2t, s, dst, fmt, sub)
                print(key, name, json.dumps(res[name])[:160], file=sys.stderr)
                return dst
            binf = conv('open', src, 'bin', FMT['bin'])
            if os.path.isfile(binf):
                conv('save', binf, ext, FMT[ext])
            conv('own', src, ext, FMT[ext])
            conv('pdf', src, 'pdf', FMT['pdf'])
            conv('odf', src, ODF[ext], FMT[ODF[ext]])
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    json.dump(out, sys.stdout, indent=1, sort_keys=True)
    print()

def diff(args):
    a, b = (json.load(open(p))['results'] for p in (args.base, args.new))
    bad = 0
    for key in sorted(set(a) | set(b)):
        if key not in a or key not in b:
            print(f'{key}: only in {"new" if key in b else "baseline"}'); bad += 1; continue
        for d in sorted(set(a[key]) | set(b[key])):
            if d == 'inputSize': continue
            x, y = a[key].get(d) or {}, b[key].get(d) or {}
            for f in ('exit', 'pages', 'textSha1'):
                if x.get(f) != y.get(f):
                    print(f'{key} {d} {f}: {x.get(f)} -> {y.get(f)}'); bad += 1
            if (x.get('size', 0) > 0) != (y.get('size', 0) > 0):
                print(f'{key} {d} output empty: {x.get("size")} -> {y.get("size")}'); bad += 1
            elif x.get('size') and abs(y.get('size', 0) - x['size']) > args.size_tol * x['size']:
                print(f'{key} {d} size {x["size"]} -> {y.get("size")} (> {args.size_tol:.0%})'); bad += 1
    print('equal' if not bad else f'{bad} difference(s)')
    sys.exit(1 if bad else 0)

p = argparse.ArgumentParser()
s = p.add_subparsers(dest='cmd', required=True)
r = s.add_parser('run'); r.add_argument('--corpus', action='append'); r.add_argument('--x2t', default=X2T)
r.set_defaults(fn=run)
d = s.add_parser('diff'); d.add_argument('base'); d.add_argument('new')
d.add_argument('--size-tol', type=float, default=0.10, help='relative output size change flagged (default 0.10)')
d.set_defaults(fn=diff)
a = p.parse_args()
if a.cmd == 'run' and not a.corpus: a.corpus = [TEMPLATES]
a.fn(a)
