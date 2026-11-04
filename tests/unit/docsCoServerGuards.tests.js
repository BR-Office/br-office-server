/*
 * (c) Copyright Ascensio System SIA 2010-2025
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

// PKT-0113 (plan P1, re-applies PKT-0064): storage instantiation guard in DocsCoServer.js. Before the fix, the legacy
// fallback built `editorStat` with `new editorDataStorage()`, ignoring a separate editorStatStorage.

const {describe, test, expect, jest} = require('@jest/globals');
const docsCoServer = require('./../../DocService/sources/DocsCoServer');
const editorDataMemory = require('./../../DocService/sources/editorDataMemory');

const {createStorageInstance} = docsCoServer;

describe('createStorageInstance', () => {
  test('prefers the named export and passes the constructor arguments', () => {
    class Named {
      constructor(...args) {
        this.args = args;
      }
    }
    const legacy = function () {};
    legacy.Named = Named;
    const inst = createStorageInstance(legacy, 'Named', 'a', 2);
    expect(inst).toBeInstanceOf(Named);
    expect(inst.args).toEqual(['a', 2]);
  });
  test('legacy module: falls back to the module constructor itself, with the arguments', () => {
    function LegacyStat(dbNum) {
      this.dbNum = dbNum;
    }
    const inst = createStorageInstance(LegacyStat, 'EditorStat', '3');
    expect(inst).toBeInstanceOf(LegacyStat);
    expect(inst.dbNum).toBe('3');
  });
  test('editorStat fallback uses the stat module, not the data module', () => {
    function LegacyData() {}
    function LegacyStat() {}
    expect(createStorageInstance(LegacyStat, 'EditorStat')).toBeInstanceOf(LegacyStat);
    expect(createStorageInstance(LegacyData, 'EditorData')).toBeInstanceOf(LegacyData);
  });
  test('module with neither: clear TypeError instead of "is not a constructor"', () => {
    expect(() => createStorageInstance({}, 'EditorStat')).toThrow('storage module exports neither EditorStat nor a constructor');
    expect(() => createStorageInstance(undefined, 'EditorStat')).toThrow(TypeError);
  });
});

describe('module-level storages with the default config (editorDataMemory)', () => {
  test('editorData is an EditorData and editorStat is an EditorStat', () => {
    expect(docsCoServer.editorData).toBeInstanceOf(editorDataMemory.EditorData);
    expect(docsCoServer.editorStat).toBeInstanceOf(editorDataMemory.EditorStat);
  });
  test('editorStatProxy is null without REDIS_SERVER_DB_KEYS_NUM', () => {
    expect(docsCoServer.editorStatProxy).toBeNull();
  });
  test('editorStatProxy is an EditorStat when REDIS_SERVER_DB_KEYS_NUM is set', () => {
    const prev = process.env.REDIS_SERVER_DB_KEYS_NUM;
    process.env.REDIS_SERVER_DB_KEYS_NUM = '2';
    try {
      jest.isolateModules(() => {
        const isolated = require('./../../DocService/sources/DocsCoServer');
        const isolatedMemory = require('./../../DocService/sources/editorDataMemory');
        expect(isolated.editorStatProxy).toBeInstanceOf(isolatedMemory.EditorStat);
        expect(isolated.editorStat).toBeInstanceOf(isolatedMemory.EditorStat);
        expect(isolated.editorData).toBeInstanceOf(isolatedMemory.EditorData);
      });
    } finally {
      if (prev === undefined) {
        delete process.env.REDIS_SERVER_DB_KEYS_NUM;
      } else {
        process.env.REDIS_SERVER_DB_KEYS_NUM = prev;
      }
    }
  });
});
