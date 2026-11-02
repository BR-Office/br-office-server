---
id: PKT-0076
title: Make e2e-convert.js work against the native JWT-enabled stack
type: refactor
priority: medium
module: oracle

origin:
  type: packet
  ref: PKT-0068

depends_on: []
requires: [documentserver]

target:
  files:
    - ".theseus/oracle/perf/e2e-convert.js"
  create_in: []

context:
  cards: [oracle]
  references: []

contract:
  preserve:
    - "the output format of e2e-convert.js (per-pair timings and summary) stays the same"
    - "no production code under DocService/, FileConverter/ or Common/ changes"
  forbidden:
    - "/etc/euro-office/documentserver/local.json (read only, never written)"

acceptance:
  commands:
    - "node .theseus/oracle/perf/e2e-convert.js"
    - "npm run lint:check"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Update `.theseus/oracle/perf/e2e-convert.js` so it runs against the native Document Server (127.0.0.1:80, see environment.md): default base http://127.0.0.1, sample host 127.0.0.1, and sign requests with JWT (`Authorization: Bearer`, secret from /etc/euro-office/documentserver/local.json `services.CoAuthoring.secret.inbox.string` or an env var). Today it gets `{"error":-8}` on every pair.

## Essential context
Found by PKT-0068: it measured with a scratch copy that signed the body with jsonwebtoken (from DocService/node_modules). requires: [documentserver]

## Suggested plan
1. Change defaults to http://127.0.0.1 and sample host 127.0.0.1.
2. Read the JWT secret from env (e.g. `JWT_SECRET`) or local.json; sign the request body and send `Authorization: Bearer <token>`.
3. Run it and confirm no pair returns `{"error":-8}`.

## Executor log
- Defaults now `http://127.0.0.1` and sample host `127.0.0.1`; header comment rewritten for the native stack.
- Decision: sign HS256 with Node's built-in `crypto` (no dependency on DocService/node_modules/jsonwebtoken). Token payload is `{payload: body}` in `Authorization: Bearer`, the inbox header form DocService accepts. Secret from `$JWT_SECRET`, else `services.CoAuthoring.secret.inbox.string` of local.json (read only). No secret -> unsigned (old behaviour).
- Decision: samples default to the installed server's own templates (`/var/www/euro-office/documentserver/document-templates/new/en-US`) if present, else the old `/tmp/eo-samples`; `$SAMPLES` still wins. Output format unchanged.
- Result: full default run (10 runs, 7 pairs) exits 0 with `errors: 0` on every pair; no `{"error":-8}`. `npm run lint:check` passes (1 pre-existing warning in AdminPanel, unrelated).
- Surprise: none beyond the template dir only having docx/xlsx/pptx/pdf, which covers all PAIRS.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: e2e-convert.js signs requests with JWT and defaults to the native 127.0.0.1 server; contract and budget respected

## Lessons for the Atlas
