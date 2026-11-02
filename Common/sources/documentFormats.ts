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

// TypeScript source. Only erasable syntax is allowed (tsconfig.json: erasableSyntaxOnly):
// `node ts-strip.js` erases the types and writes documentFormats.js next to this file.
// CommonJS stays as it was (require / module.exports) so the exports shape is unchanged.

const {readFile}: typeof import('fs/promises') = require('fs/promises');

interface Logger {
  warn(format: string, ...args: unknown[]): void;
}

/** The subset of operationContext used here. */
interface OperationContext {
  logger: Logger;
}

/** One entry of onlyoffice-docs-formats.json, as read from disk (unvalidated). */
interface FormatEntry {
  name?: unknown;
  type?: unknown;
  actions?: unknown;
}

const CATEGORIES = [
  'pdfView',
  'pdfEdit',
  'wordView',
  'wordEdit',
  'cellView',
  'cellEdit',
  'slideView',
  'slideEdit',
  'diagramView',
  'diagramEdit',
  'forms'
] as const;

type Category = (typeof CATEGORIES)[number];

/** Map of category -> extensions. */
type FormatsByCategory = Record<Category, string[]>;

// Keyed by filePath: documentFormatsFile is per-tenant, so a single global cache
// would serve one tenant's format list to all tenants.
const cache = new Map<string, FormatsByCategory>();

/**
 * Load and parse all formats from JSON file (with caching)
 * @param {string} filePath - Full path to onlyoffice-docs-formats.json
 * @param {Object} ctx - operation context, used to log when the file cannot be read
 * @returns {Promise<Object>} Map of category -> extensions array
 */
async function getAllFormats(filePath: string, ctx: OperationContext): Promise<FormatsByCategory> {
  if (cache.has(filePath)) {
    return cache.get(filePath) as FormatsByCategory;
  }

  // Initialize empty categories
  const result = Object.fromEntries(CATEGORIES.map((key): [Category, string[]] => [key, []])) as FormatsByCategory;

  if (!filePath) {
    ctx.logger.warn('getAllFormats: documentFormatsFile is not configured; WOPI discovery will list no formats');
    return result;
  }

  try {
    const formats: unknown = JSON.parse(await readFile(filePath, 'utf8'));

    if (!Array.isArray(formats)) {
      ctx.logger.warn('getAllFormats: "%s" is not a JSON array; WOPI discovery will list no formats', filePath);
      return result;
    }

    for (const {name, type, actions} of formats as FormatEntry[]) {
      if (!name || !type || !Array.isArray(actions)) {
        continue;
      }

      // 'edit' = native edit, 'lossy-edit' = edit with potential format loss
      const hasEdit = actions.includes('edit') || actions.includes('lossy-edit');
      const hasView = actions.includes('view');
      const key: string = (type as string) + (hasEdit ? 'Edit' : hasView ? 'View' : '');

      // Same lookup as before: any key on the object (including inherited ones) counts
      const list = (result as Record<string, string[] | undefined>)[key];
      if (list) {
        list.push(name as string);
      }

      if (type === 'pdf' && actions.includes('fill')) {
        result.forms.push(name as string);
      }
    }
  } catch (err) {
    // Do not cache the empty result, so a later request retries once the file is available
    ctx.logger.warn('getAllFormats: failed to read formats file "%s": %s', filePath, (err as Error).stack);
    return result;
  }

  // Cache only a successfully parsed result
  cache.set(filePath, result);
  return result;
}

module.exports = {getAllFormats};
