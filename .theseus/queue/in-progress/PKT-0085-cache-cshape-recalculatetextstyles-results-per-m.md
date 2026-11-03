---
id: PKT-0085
title: Cache CShape.recalculateTextStyles results per (master, layout, placeholder, lstStyle, autofit) on pptx open
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0078

depends_on: [PKT-0078]

target:
  files:
    - external/sdkjs/common/Drawings/Format/Shape.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/queue/in-progress/PKT-0078-cache-shape-text-styles-cshape-recalculatetextst.md
requires: [documentserver, browser]

contract:
  preserve:
    - "Text styles resolved for every shape (placeholder inheritance master -> layout -> slide, theme fonts, lstStyle, autofit fontScale/lnSpcReduction, fontRef/smartArt fill) stay identical"
    - "Existing sdkjs tests keep passing"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-common.sh"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Cache CShape.recalculateTextStyles results per (master, layout, placeholder, lstStyle, autofit) on pptx open.

## Essential context
PKT-0078 measured (deck-50.pptx, native DS 9.3.7) that CShape.recalculateTextStyles (120-190 ms inclusive) is NOT an
ancestor of StyleCache/sha256: the style cache is called from ParaRun.Get_CompiledPr during paragraph recalculation.
Its cost is building CStyle/CStyles objects and Copy() of ppt levels per shape and level. A cache must key on master,
layout, placeholder type/idx, hierarchy and own lstStyle, bodyPr autofit (or tmp values when bCheckAutoFitFlag), fontRef
and smartArt fill, editor type, and be invalidated when any of these change; Get_Styles hands the object out once
(compiledStyles[level] = undefined), so check whether consumers mutate it before sharing.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.19.1 (TEP-0006/0007/0008)
- attempt 1: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)

## Spawned packets

## Review

## Lessons for the Atlas
