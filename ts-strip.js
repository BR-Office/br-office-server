/*
 * (c) Copyright Ascensio System SIA 2010-2024
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

'use strict';

/*
 * Build step for the TypeScript sources of Common and DocService (`npm run build:ts`).
 *
 * Writes foo.js next to every foo.ts by erasing the types with Node's built-in type stripper
 * (module.stripTypeScriptTypes, Node >= 22.13). Erasing keeps every line and column in place,
 * so stack traces point at the right .ts line without source maps. tsc (TypeScript 7) only
 * type-checks (tsconfig.json has noEmit); it is a dev dependency and is not needed to build.
 *
 * The emitted .js files are not committed: each one is listed in .gitignore.
 * See .theseus/adapter/interop-javascript-typescript.md.
 */

const fs = require('node:fs');
const path = require('node:path');
const nodeModule = require('node:module');

const SOURCE_DIRS = ['Common/sources', 'DocService/sources'];
const GENERATED_NOTE = '\n// Generated from %s by ts-strip.js. Do not edit: change the .ts file and run `npm run build:ts`.\n';

function findTypeScriptFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') {
        found.push(...findTypeScriptFiles(fullPath));
      }
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      found.push(fullPath);
    }
  }
  return found;
}

function build(rootDir) {
  if (typeof nodeModule.stripTypeScriptTypes !== 'function') {
    throw new Error(`ts-strip.js needs Node >= 22.13 (module.stripTypeScriptTypes); running ${process.version}`);
  }
  const written = [];
  for (const sourceDir of SOURCE_DIRS) {
    const absDir = path.join(rootDir, sourceDir);
    if (!fs.existsSync(absDir)) {
      continue;
    }
    for (const tsFile of findTypeScriptFiles(absDir)) {
      const jsFile = tsFile.slice(0, -'.ts'.length) + '.js';
      const code = nodeModule.stripTypeScriptTypes(fs.readFileSync(tsFile, 'utf8'), {mode: 'strip'});
      const output = code + GENERATED_NOTE.replace('%s', path.basename(tsFile));
      fs.writeFileSync(jsFile, output);
      written.push(path.relative(rootDir, jsFile));
    }
  }
  return written;
}

module.exports = {build};

if (require.main === module) {
  const written = build(__dirname);
  console.log(`ts-strip: wrote ${written.length} file(s)${written.length ? ': ' + written.join(', ') : ''}`);
}
