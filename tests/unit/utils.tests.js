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
  test('addSeconds mutates the date', () => {
    const d = new Date(Date.UTC(2020, 0, 1, 0, 0, 0));
    const res = utils.addSeconds(d, 90);
    expect(res).toBeUndefined();
    expect(d.getTime()).toEqual(Date.UTC(2020, 0, 1, 0, 1, 30));
  });

  test('getMillisecondsOfHour', () => {
    const d = new Date(Date.UTC(2020, 5, 1, 7, 2, 3, 4));
    expect(utils.getMillisecondsOfHour(d)).toEqual((2 * 60 + 3) * 1000 + 4);
  });

  test('encodeXml escapes special characters', () => {
    expect(utils.encodeXml('<a b="c" d=\'e\'>&\r\n\t\xA0</a>')).toEqual('&lt;a b=&quot;c&quot; d=&apos;e&apos;&gt;&amp;&#xD;&#xA;&#x9;&#xA0;&lt;/a&gt;');
    expect(utils.encodeXml('plain')).toEqual('plain');
  });

  test('compareStringByLength', () => {
    expect(utils.compareStringByLength('aa', 'b')).toEqual(1);
    expect(utils.compareStringByLength('a', 'bb')).toEqual(-1);
    expect(utils.compareStringByLength('a', 'b')).toBeLessThan(0);
    expect(utils.compareStringByLength('b', 'a')).toBeGreaterThan(0);
    expect(utils.compareStringByLength('a', 'a')).toEqual(0);
  });

  test('containsAllAscii / containsAllAsciiNP', () => {
    expect(utils.containsAllAscii('abc\n')).toBe(true);
    expect(utils.containsAllAscii('é')).toBe(false);
    expect(utils.containsAllAscii('')).toBe(true);
    expect(utils.containsAllAsciiNP('abc 123~')).toBe(true);
    expect(utils.containsAllAsciiNP('abc\n')).toBe(false);
    expect(utils.containsAllAsciiNP('é')).toBe(false);
  });

  test('isEmptyObject', () => {
    expect(utils.isEmptyObject({})).toBe(true);
    expect(utils.isEmptyObject(null)).toBe(true);
    expect(utils.isEmptyObject(undefined)).toBe(true);
    expect(utils.isEmptyObject({a: 1})).toBe(false);
  });

  test('getIndexFromUserId', () => {
    expect(utils.getIndexFromUserId('user12', 'user')).toEqual(12);
    expect(utils.getIndexFromUserId('user', 'user')).toBeNaN();
  });

  test('getDateTimeTicks', () => {
    expect(utils.getDateTimeTicks(new Date(0))).toEqual(621355968000000000n);
    expect(utils.getDateTimeTicks(new Date(1000))).toEqual(621355968000000000n + 10000000n);
  });

  test('resolvePath', () => {
    const obj = {a: {b: {c: 5}}};
    expect(utils.resolvePath(obj, 'a.b.c')).toEqual(5);
    expect(utils.resolvePath(obj, 'a.x.c', 'def')).toEqual('def');
    expect(utils.resolvePath(obj, 'a.b')).toEqual({c: 5});
  });

  test('removeIllegalCharacters', () => {
    expect(utils.removeIllegalCharacters('a/b\\c?d%e*f:g|h"i<j>k')).toEqual('a-b-c-d-e-f-g-h-i-j-k');
    expect(utils.removeIllegalCharacters('')).toEqual('');
    expect(utils.removeIllegalCharacters(undefined)).toBeUndefined();
  });

  test('getFunctionArguments', () => {
    expect(utils.getFunctionArguments((_a, _b) => 0)).toEqual(['_a', '_b']);
    expect(utils.getFunctionArguments(x => x)).toEqual(['x']);
  });

  test('isObject / deepMergeObjects', () => {
    expect(utils.isObject({})).toBe(true);
    expect(utils.isObject([])).toBe(false);
    expect(utils.isObject('s')).toBe(false);
    expect(utils.isObject(null)).toBeNull();
    const target = {a: {b: 1, c: 2}, d: 1};
    const res = utils.deepMergeObjects(target, {a: {b: 9}, e: [1]}, {f: 3});
    expect(res).toBe(target);
    expect(target).toEqual({a: {b: 9, c: 2}, d: 1, e: [1], f: 3});
  });

  test('getImpl', () => {
    const obj = {a: {b: {c: 1}}, n: null};
    expect(utils.getImpl(obj, 'a.b.c')).toEqual(1);
    expect(utils.getImpl(obj, ['a', 'b'])).toEqual({c: 1});
    expect(utils.getImpl(obj, 'n.x')).toBeUndefined();
    expect(utils.getImpl(obj, 'a.b.c.d')).toBeUndefined();
  });

  test('Date helpers: leap year, days in month, addMonths', () => {
    expect(Date.isLeapYear(2000)).toBe(true);
    expect(Date.isLeapYear(1900)).toBe(false);
    expect(Date.getDaysInMonth(2024, 1)).toEqual(29);
    expect(Date.getDaysInMonth(2023, 1)).toEqual(28);
    const d = new Date(Date.UTC(2023, 0, 31));
    expect(d.addMonths(1)).toBe(d);
    expect(d.toISOString()).toEqual('2023-02-28T00:00:00.000Z');
  });

  test('getMonthDiff / getLicensePeriod', () => {
    expect(utils.getMonthDiff(new Date(Date.UTC(2020, 10, 1)), new Date(Date.UTC(2021, 1, 1)))).toEqual(3);
    const start = new Date(Date.UTC(2020, 0, 15, 10));
    const now = new Date(Date.UTC(2020, 3, 10, 5));
    expect(utils.getLicensePeriod(start, now)).toEqual(Date.UTC(2020, 2, 15));
    expect(start.getTime()).toEqual(Date.UTC(2020, 0, 15, 10));
  });
});
