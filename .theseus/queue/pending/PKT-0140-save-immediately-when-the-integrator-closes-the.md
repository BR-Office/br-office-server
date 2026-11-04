---
id: PKT-0140
title: Save immediately when the integrator closes the editor (requestClose/destroyEditor) and measure it
type: investigate
priority: medium
module: web-apps

origin:
  type: packet
  ref: PKT-0137

depends_on: []

target:
  files:
    - .theseus/journeys/save.md
  create_in:
    - .theseus/oracle/journeys/

context:
  cards: [web-apps, docservice]
  references:
    - .theseus/journeys/save.md
    - .theseus/queue/in-progress/PKT-0137-do-not-wait-savetimeoutdelay-5-s-before-saving-an-explicitly.md

contract:
  preserve:
    - "bash .theseus/oracle/journeys/save.sh keeps measuring the tab-close path (its numbers stay comparable)"
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/journeys/save-explicit-close.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Save immediately when the integrator closes the editor (requestClose/destroyEditor) and measure it.

Add a variant of the save journey, `save-explicit-close.sh` (+ its `-run.cjs`), in which the editor is closed through
the integrator path that makes the client send the socket message `{type:"close"}` (sdkjs
`DocsCoApi.disconnect()` without a code, via `asc_coAuthoringDisconnect`). Measure it and add the result to journeys/save.md.

## Essential context
- PKT-0137 found: DocService already saves with `noDelay` when it gets `{type:"close"}` (DocsCoServer.js closeDocument,
  `noDelay = !reason || getIsShutdown()`). A tab close or reload sends nothing: web-apps `onBeforeUnload` only saves
  localStorage, and socket.io's `closeOnBeforeunload:true` drops the transport, so the server sees `transport close`,
  exactly as for a reload. The browser can't tell a reload from a close, so only the integrator knows that a close is
  final. The 5 s delay therefore stays for tab close and should go away for an integrator close.
- First find out which integrator API reaches `asc_coAuthoringDisconnect` in this build (e.g. `docEditor.requestClose` /
  `destroyEditor`, or `onRequestClose` in web-apps). If none does, record that and request a web-apps fork packet.
- Expected: ~0.85 s (x2t and plumbing only).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
