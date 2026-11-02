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

const {describe, test, expect} = require('@jest/globals');
const config = require('../../Common/node_modules/config');

const operationContext = require('../../Common/sources/operationContext');
const utils = require('../../Common/sources/utils');

const ctx = new operationContext.Context();
const minimumIterationsByteLength = 4;

describe('AES encryption & decryption', () => {
  test('Iterations range', async () => {
    const configuration = config.util.cloneDeep(config.get('aesEncrypt.config'));
    const encrypted = await utils.encryptPassword(ctx, 'secretstring');
    const {iterationsByteLength = 5} = configuration;

    const [iterationsHex] = encrypted.split(':');
    const iterations = parseInt(iterationsHex, 16);

    const iterationsLength = iterationsByteLength < minimumIterationsByteLength ? minimumIterationsByteLength : iterationsByteLength;
    expect(iterations).toBeGreaterThanOrEqual(Math.pow(10, iterationsLength - 1));
    expect(iterations).toBeLessThanOrEqual(Math.pow(10, iterationsLength) - 1);
  });

  test('Correct workflow', async () => {
    const encrypted = await utils.encryptPassword(ctx, 'secretstring');
    const decrypted = await utils.decryptPassword(ctx, encrypted);
    expect(decrypted).toEqual('secretstring');
  });
});

describe('Characterization: pure helpers', () => {
  test('encodeXml escapes special characters', () => {
    expect(utils.encodeXml('<a href="x">\'&\'</a>\r\n\t\xA0')).toBe('&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;&#xD;&#xA;&#x9;&#xA0;');
    expect(utils.encodeXml('plain')).toBe('plain');
  });

  test('addSeconds mutates the date in place', () => {
    const date = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));
    const result = utils.addSeconds(date, 90);
    expect(result).toBeUndefined();
    expect(date.getTime()).toBe(Date.UTC(2020, 0, 1, 0, 1, 30));
  });

  test('getMillisecondsOfHour', () => {
    expect(utils.getMillisecondsOfHour(new Date(Date.UTC(2020, 0, 1, 5, 2, 3, 4)))).toBe((2 * 60 + 3) * 1000 + 4);
  });

  test('compareStringByLength', () => {
    expect(utils.compareStringByLength('a', 'bb')).toBeLessThan(0);
    expect(utils.compareStringByLength('bb', 'a')).toBeGreaterThan(0);
    expect(utils.compareStringByLength('a', 'a')).toBe(0);
    expect(utils.compareStringByLength('a', 'b')).toBeLessThan(0);
    expect(utils.compareStringByLength('a', null)).toBe(1);
    expect(utils.compareStringByLength(null, 'a')).toBe(-1);
    expect(utils.compareStringByLength(null, null)).toBe(0);
    // empty string is falsy but not null, so it is treated as present and sorts after
    expect(utils.compareStringByLength('', 'a')).toBe(1);
  });

  test('containsAllAscii / containsAllAsciiNP', () => {
    expect(utils.containsAllAscii('abc\n')).toBe(true);
    expect(utils.containsAllAscii('é')).toBe(false);
    expect(utils.containsAllAsciiNP('abc 123~')).toBe(true);
    expect(utils.containsAllAsciiNP('abc\n')).toBe(false);
    expect(utils.containsAllAsciiNP('')).toBe(true);
  });

  test('isEmptyObject', () => {
    expect(utils.isEmptyObject({})).toBe(true);
    expect(utils.isEmptyObject(null)).toBe(true);
    expect(utils.isEmptyObject(undefined)).toBe(true);
    expect(utils.isEmptyObject({a: 1})).toBe(false);
  });

  test('getIndexFromUserId', () => {
    expect(utils.getIndexFromUserId('user12', 'user')).toBe(12);
    expect(utils.getIndexFromUserId('user', 'user')).toBeNaN();
  });

  test('checkPathTraversal', () => {
    const warnings = [];
    const testCtx = {logger: {warn: (...args) => warnings.push(args)}};
    expect(utils.checkPathTraversal(testCtx, 'doc', '/root/dir', '/root/dir/file')).toBe(true);
    expect(utils.checkPathTraversal(testCtx, 'doc', '/root/dir', '/etc/passwd')).toBe(false);
    expect(utils.checkPathTraversal(testCtx, 'doc', '/root/dir', '/root/dir/a\0b')).toBe(false);
    expect(warnings).toHaveLength(2);
    // characterization: only a prefix check, so ".." segments are not detected
    expect(utils.checkPathTraversal(testCtx, 'doc', '/root/dir', '/root/dir/../x')).toBe(true);
  });

  test('getDateTimeTicks', () => {
    expect(utils.getDateTimeTicks(new Date(0))).toBe(621355968000000000n);
    expect(utils.getDateTimeTicks(new Date(1000))).toBe(621355968000000000n + 10000000n);
  });

  test('resolvePath', () => {
    const obj = {a: {b: {c: 5}}};
    expect(utils.resolvePath(obj, 'a.b.c')).toBe(5);
    expect(utils.resolvePath(obj, 'a.b')).toEqual({c: 5});
    expect(utils.resolvePath(obj, 'a.x.c', 'def')).toBe('def');
  });

  test('removeIllegalCharacters', () => {
    expect(utils.removeIllegalCharacters('a/b\\c?d%e*f:g|h"i<j>k')).toBe('a-b-c-d-e-f-g-h-i-j-k');
    expect(utils.removeIllegalCharacters('')).toBe('');
    expect(utils.removeIllegalCharacters(undefined)).toBeUndefined();
  });

  test('getFunctionArguments', () => {
    expect(utils.getFunctionArguments(function foo(a, b) {})).toEqual(['a', 'b']);
    expect(utils.getFunctionArguments((x, y, z) => x)).toEqual(['x', 'y', 'z']);
  });

  test('isObject / deepMergeObjects', () => {
    expect(utils.isObject({})).toBe(true);
    expect(utils.isObject([])).toBe(false);
    expect(utils.isObject(null)).toBeFalsy();
    const target = {a: {x: 1}, b: 1};
    const merged = utils.deepMergeObjects(target, {a: {y: 2}, c: 3}, {b: 4});
    expect(merged).toEqual({a: {x: 1, y: 2}, b: 4, c: 3});
    expect(merged).toBe(target);
  });
});

describe('Characterization: date helpers', () => {
  test('Date.isLeapYear and getDaysInMonth', () => {
    expect(Date.isLeapYear(2000)).toBe(true);
    expect(Date.isLeapYear(1900)).toBe(false);
    expect(Date.isLeapYear(2024)).toBe(true);
    expect(Date.getDaysInMonth(2024, 1)).toBe(29);
    expect(Date.getDaysInMonth(2023, 1)).toBe(28);
    expect(Date.getDaysInMonth(2023, 11)).toBe(31);
  });

  test('addMonths clamps the day to month length', () => {
    const d = new Date(Date.UTC(2023, 0, 31));
    expect(d.addMonths(1)).toBe(d);
    expect(d.toISOString()).toBe('2023-02-28T00:00:00.000Z');
  });

  test('getMonthDiff', () => {
    expect(utils.getMonthDiff(new Date(Date.UTC(2020, 10, 5)), new Date(Date.UTC(2021, 1, 1)))).toBe(3);
  });

  test('getLicensePeriod', () => {
    const start = new Date(Date.UTC(2020, 0, 31, 12));
    const now = new Date(Date.UTC(2020, 2, 15, 8));
    expect(utils.getLicensePeriod(start, now)).toBe(Date.UTC(2020, 1, 29));
  });
});
