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

describe('Characterization: empty and null inputs', () => {
  test('encryptPassword / decryptPassword with empty and invalid passwords', async () => {
    const encrypted = await utils.encryptPassword(ctx, '');
    expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(await utils.decryptPassword(ctx, encrypted)).toEqual('');
    // errors raised inside node core come from another realm, so match by name instead of by constructor
    await expect(utils.encryptPassword(ctx, null)).rejects.toMatchObject({name: 'TypeError'});
    await expect(utils.encryptPassword(ctx, undefined)).rejects.toMatchObject({name: 'TypeError'});
    await expect(utils.decryptPassword(ctx, '')).rejects.toMatchObject({name: 'TypeError'});
    await expect(utils.decryptPassword(ctx, null)).rejects.toMatchObject({name: 'TypeError'});
    await expect(utils.decryptPassword(ctx, undefined)).rejects.toMatchObject({name: 'TypeError'});
  });

  test('compareStringByLength treats the empty string as a missing value', () => {
    // surprising: an empty string sorts after a non-empty one and is not equal to another empty string
    expect(utils.compareStringByLength('', 'a')).toEqual(1);
    expect(utils.compareStringByLength('a', '')).toEqual(1);
    expect(utils.compareStringByLength('', '')).toEqual(1);
    expect(utils.compareStringByLength(null, 'a')).toEqual(-1);
    expect(utils.compareStringByLength('a', null)).toEqual(1);
    expect(utils.compareStringByLength('a', undefined)).toEqual(1);
    expect(utils.compareStringByLength(null, '')).toEqual(-1);
    expect(utils.compareStringByLength('', null)).toEqual(1);
    expect(utils.compareStringByLength(null, null)).toEqual(0);
    expect(utils.compareStringByLength(undefined, undefined)).toEqual(0);
  });

  test('encodeXml, addSeconds, getMillisecondsOfHour, getDateTimeTicks with empty or null', () => {
    expect(utils.encodeXml('')).toEqual('');
    expect(() => utils.encodeXml(null)).toThrow(TypeError);
    expect(() => utils.encodeXml(undefined)).toThrow(TypeError);
    expect(() => utils.addSeconds(null, 1)).toThrow(TypeError);
    expect(() => utils.getMillisecondsOfHour(null)).toThrow(TypeError);
    expect(() => utils.getDateTimeTicks(null)).toThrow(TypeError);
  });

  test('containsAllAscii / containsAllAsciiNP coerce null and undefined to strings', () => {
    expect(utils.containsAllAscii(null)).toBe(true);
    expect(utils.containsAllAscii(undefined)).toBe(true);
    expect(utils.containsAllAsciiNP('')).toBe(true);
    expect(utils.containsAllAsciiNP(null)).toBe(true);
    expect(utils.containsAllAsciiNP(undefined)).toBe(true);
  });

  test('isEmptyObject with falsy values', () => {
    expect(utils.isEmptyObject('')).toBe(true);
    expect(utils.isEmptyObject(0)).toBe(true);
    expect(utils.isEmptyObject([])).toBe(true);
  });

  test('getIndexFromUserId with empty and null arguments', () => {
    expect(utils.getIndexFromUserId('', '')).toBeNaN();
    expect(utils.getIndexFromUserId('user', '')).toBeNaN();
    expect(utils.getIndexFromUserId('12', '')).toEqual(12);
    expect(() => utils.getIndexFromUserId(null, 'user')).toThrow(TypeError);
    expect(() => utils.getIndexFromUserId(undefined, 'user')).toThrow(TypeError);
    expect(() => utils.getIndexFromUserId('user1', null)).toThrow(TypeError);
  });

  test('resolvePath with empty and null arguments', () => {
    expect(utils.resolvePath(null, 'a', 'def')).toEqual('def');
    expect(utils.resolvePath(undefined, 'a', 'def')).toEqual('def');
    // the default value is indexed again by the next path segment
    expect(utils.resolvePath(null, 'a.b', 'def')).toBeUndefined();
    expect(utils.resolvePath({a: 1}, '', 'def')).toBeUndefined();
    expect(() => utils.resolvePath({a: 1}, null, 'def')).toThrow(TypeError);
  });

  test('removeIllegalCharacters and getFunctionArguments with null', () => {
    expect(utils.removeIllegalCharacters(null)).toBeNull();
    expect(() => utils.getFunctionArguments(null)).toThrow(TypeError);
  });

  test('isObject / deepMergeObjects with empty and null', () => {
    expect(utils.isObject(undefined)).toBeUndefined();
    expect(utils.isObject('')).toEqual('');
    expect(utils.isObject(0)).toEqual(0);
    const target = {a: 1};
    expect(utils.deepMergeObjects(target)).toBe(target);
    expect(utils.deepMergeObjects(target, null, undefined)).toBe(target);
    expect(target).toEqual({a: 1});
    expect(utils.deepMergeObjects(null, {a: 1})).toBeNull();
  });

  test('getImpl with empty and null arguments', () => {
    expect(utils.getImpl({a: 1}, '')).toBeUndefined();
    expect(utils.getImpl({a: 1}, [])).toBeUndefined();
    expect(() => utils.getImpl(null, 'a')).toThrow(TypeError);
    expect(() => utils.getImpl(undefined, 'a')).toThrow(TypeError);
    expect(() => utils.getImpl({a: 1}, null)).toThrow(TypeError);
  });

  test('Date helpers and license helpers with null', () => {
    // surprising: null is coerced to 0, which is a leap year
    expect(Date.isLeapYear(null)).toBe(true);
    expect(Date.isLeapYear(undefined)).toBe(false);
    expect(() => utils.getMonthDiff(null, new Date(0))).toThrow(TypeError);
    expect(() => utils.getLicensePeriod(null, new Date(0))).toThrow(TypeError);
    expect(() => utils.getLicensePeriod(new Date(0), null)).toThrow(TypeError);
  });
});

describe('Characterization: remaining pure helpers', () => {
  const constants = require('../../Common/sources/constants');
  const makeCtx = cfg => {
    const c = new operationContext.Context();
    c.config = cfg;
    return c;
  };
  const fakeReq = (headers, protocol) => ({
    protocol,
    get: name => headers[name.toLowerCase()]
  });

  test('getContentDisposition defaults to attachment and ignores the user agent', () => {
    expect(utils.getContentDisposition('a.txt')).toEqual('attachment; filename="a.txt"');
    expect(utils.getContentDisposition('a.txt', 'Mozilla', 'inline')).toEqual('inline; filename="a.txt"');
    expect(utils.getContentDisposition('a.txt', 'Mozilla')).toEqual(utils.getContentDisposition('a.txt'));
    expect(utils.getContentDisposition()).toEqual('attachment');
    expect(utils.getContentDisposition('имя.txt')).toMatch(/^attachment; filename="\?+\.txt"; filename\*=UTF-8''/);
  });

  test.each([
    ['NO_ERROR', 0],
    ['CONVERT_CELLLIMITS', 0],
    ['TASK_QUEUE', -6],
    ['TASK_RESULT', -6],
    ['CONVERT_PASSWORD', -5],
    ['CONVERT_DRM', -5],
    ['CONVERT_DRM_UNSUPPORTED', -5],
    ['CONVERT_DOWNLOAD', -4],
    ['CONVERT_TIMEOUT', -2],
    ['CONVERT_DEAD_LETTER', -2],
    ['CONVERT_PARAMS', -7],
    ['CONVERT_LIMITS', -10],
    ['CONVERT_NEED_PARAMS', -3],
    ['CONVERT_LIBREOFFICE', -3],
    ['CONVERT_CORRUPTED', -3],
    ['CONVERT_UNKNOWN_FORMAT', -3],
    ['CONVERT_READ_FILE', -3],
    ['CONVERT_TEMPORARY', -3],
    ['CONVERT', -3],
    ['CONVERT_DETECT', -9],
    ['VKEY', -8],
    ['VKEY_ENCRYPT', -8],
    ['VKEY_KEY_EXPIRE', -8],
    ['VKEY_USER_COUNT_EXCEED', -8],
    ['STORAGE', -1],
    ['STORAGE_FILE_NO_FOUND', -1],
    ['STORAGE_READ', -1],
    ['STORAGE_WRITE', -1],
    ['STORAGE_REMOVE_DIR', -1],
    ['STORAGE_CREATE_DIR', -1],
    ['STORAGE_GET_INFO', -1],
    ['UPLOAD', -1],
    ['READ_REQUEST_STREAM', -1],
    ['UNKNOWN', -1]
  ])('mapAscServerErrorToOldError maps %s to %i', (name, expected) => {
    expect(constants[name]).toBeDefined();
    expect(utils.mapAscServerErrorToOldError(constants[name])).toEqual(expected);
  });

  test('mapAscServerErrorToOldError falls back to -1 for unknown input', () => {
    expect(utils.mapAscServerErrorToOldError(123456)).toEqual(-1);
    expect(utils.mapAscServerErrorToOldError(undefined)).toEqual(-1);
    expect(utils.mapAscServerErrorToOldError(null)).toEqual(-1);
    expect(utils.mapAscServerErrorToOldError('0')).toEqual(-1);
  });

  test('changeOnlyOfficeUrl appends the ooname parameter with the file extension', () => {
    expect(utils.changeOnlyOfficeUrl('http://h/file', 'doc.docx')).toEqual('http://h/file?ooname=output.docx');
    expect(utils.changeOnlyOfficeUrl('http://h/file?a=1', 'doc.docx')).toEqual('http://h/file?a=1&ooname=output.docx');
    // optFilename wins over strPath
    expect(utils.changeOnlyOfficeUrl('http://h/f', 'doc.docx', 'x.xlsx')).toEqual('http://h/f?ooname=output.xlsx');
    // no extension gives an empty extension
    expect(utils.changeOnlyOfficeUrl('http://h/f', 'noext')).toEqual('http://h/f?ooname=output');
    // an empty optFilename falls back to strPath
    expect(utils.changeOnlyOfficeUrl('http://h/f', 'a.pdf', '')).toEqual('http://h/f?ooname=output.pdf');
    expect(() => utils.changeOnlyOfficeUrl(null, 'a.pdf')).toThrow(TypeError);
  });

  test('getSecretByElem returns the string, reads and caches a file, or undefined', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    expect(utils.getSecretByElem(undefined)).toBeUndefined();
    expect(utils.getSecretByElem(null)).toBeUndefined();
    expect(utils.getSecretByElem({})).toBeUndefined();
    expect(utils.getSecretByElem({string: ''})).toBeUndefined();
    expect(utils.getSecretByElem({string: 's3'})).toEqual('s3');
    // string has priority over file
    expect(utils.getSecretByElem({string: 's3', file: '/nonexistent'})).toEqual('s3');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-'));
    const file = path.join(dir, 'key.pem');
    try {
      fs.writeFileSync(file, 'first');
      const first = utils.getSecretByElem({file});
      expect(Buffer.isBuffer(first)).toBe(true);
      expect(first.toString()).toEqual('first');
      // the second read comes from the cache, not from the disk
      fs.writeFileSync(file, 'second');
      expect(utils.getSecretByElem({file}).toString()).toEqual('first');
    } finally {
      fs.rmSync(dir, {recursive: true, force: true});
    }
    expect(() => utils.getSecretByElem({file: '/nonexistent/key.pem'})).toThrow(/ENOENT/);
  });

  test('getJwtHsKey builds and caches a secret KeyObject', () => {
    const key = utils.getJwtHsKey('secret');
    expect(key.type).toEqual('secret');
    expect(key.symmetricKeySize).toEqual(6);
    expect(utils.getJwtHsKey('secret')).toBe(key);
    const bufKey = utils.getJwtHsKey(Buffer.from('abcd'));
    expect(bufKey.symmetricKeySize).toEqual(4);
    expect(utils.getJwtHsKey(undefined)).toBeUndefined();
    expect(utils.getJwtHsKey(null)).toBeUndefined();
  });

  test('getJwtHsKey: behavior for empty and non-string secrets', () => {
    // an empty string is falsy for the cache lookup, but createSecretKey accepts it
    const empty = utils.getJwtHsKey('');
    expect(empty).toBeDefined();
    expect(empty.symmetricKeySize).toEqual(0);
    // invalid types are swallowed and reported as undefined
    expect(utils.getJwtHsKey(123)).toBeUndefined();
    expect(utils.getJwtHsKey({})).toBeUndefined();
  });

  test('convertLicenseInfoToFileParams maps fields and mode flags', () => {
    const info = {
      startDate: new Date(Date.UTC(2020, 0, 1)),
      endDate: new Date(Date.UTC(2021, 0, 1)),
      mode: constants.LICENSE_MODE.Limited | constants.LICENSE_MODE.Developer,
      branding: true,
      customization: false,
      advancedApi: true,
      connections: 10,
      connectionsView: 20,
      usersCount: 5,
      usersViewCount: 6,
      usersExpire: 3 * constants.LICENSE_EXPIRE_USERS_ONE_DAY,
      customerId: 'cid',
      alias: 'al',
      multitenancy: true,
      graceDays: 7
    };
    expect(utils.convertLicenseInfoToFileParams(info)).toEqual({
      start_date: '2020-01-01T00:00:00.000Z',
      end_date: '2021-01-01T00:00:00.000Z',
      timelimited: true,
      trial: false,
      developer: true,
      branding: true,
      customization: false,
      advanced_api: true,
      connections: 10,
      connections_view: 20,
      users_count: 5,
      users_view_count: 6,
      users_expire: 3,
      customer_id: 'cid',
      alias: 'al',
      multitenancy: true,
      grace_days: 7
    });
  });

  test('convertLicenseInfoToFileParams with missing fields', () => {
    const res = utils.convertLicenseInfoToFileParams({});
    expect(res.start_date).toBeUndefined();
    expect(res.end_date).toBeUndefined();
    expect(res.timelimited).toBe(false);
    expect(res.trial).toBe(false);
    expect(res.developer).toBe(false);
    // surprising: undefined / number gives NaN
    expect(res.users_expire).toBeNaN();
    expect(() => utils.convertLicenseInfoToFileParams(null)).toThrow(TypeError);
  });

  test('convertLicenseInfoToServerParams maps fields and adds build info', () => {
    const commonDefines = require('../../Common/sources/commondefines');
    const res = utils.convertLicenseInfoToServerParams({
      count: 3,
      type: 2,
      packageType: 1,
      buildDate: new Date(Date.UTC(2022, 5, 7))
    });
    expect(res).toEqual({
      workersCount: 3,
      resultType: 2,
      packageType: 1,
      buildDate: '2022-06-07T00:00:00.000Z',
      buildVersion: commonDefines.buildVersion,
      buildNumber: commonDefines.buildNumber
    });
    const empty = utils.convertLicenseInfoToServerParams({});
    expect(empty.workersCount).toBeUndefined();
    expect(empty.buildDate).toBeUndefined();
    expect(() => utils.convertLicenseInfoToServerParams(undefined)).toThrow(TypeError);
  });

  describe('checkIpFilter', () => {
    const cfg = rules => ({services: {CoAuthoring: {ipfilter: {rules, errorcode: 418}}}});

    test('allows everything with the default rules', () => {
      expect(utils.checkIpFilter(new operationContext.Context(), '1.2.3.4')).toEqual(0);
    });

    test('first matching rule wins; denied rule returns the error code', () => {
      const c = makeCtx(
        cfg([
          {address: '10.0.0.*', allowed: true},
          {address: '10.*', allowed: false},
          {address: '*', allowed: true}
        ])
      );
      expect(utils.checkIpFilter(c, '10.0.0.5')).toEqual(0);
      expect(utils.checkIpFilter(c, '10.1.0.5')).toEqual(418);
      expect(utils.checkIpFilter(c, '192.168.0.1')).toEqual(0);
    });

    test('no matching rule means allowed', () => {
      const c = makeCtx(cfg([{address: '10.*', allowed: false}]));
      expect(utils.checkIpFilter(c, '11.0.0.1')).toEqual(0);
      expect(utils.checkIpFilter(c, 'not-an-ip')).toEqual(0);
      expect(utils.checkIpFilter(c, undefined)).toEqual(0);
    });

    test('matches IPv4-mapped IPv6 addresses against IPv4 rules and vice versa', () => {
      const c = makeCtx(cfg([{address: '10.0.0.1', allowed: false}]));
      expect(utils.checkIpFilter(c, '::ffff:10.0.0.1')).toEqual(418);
      expect(utils.checkIpFilter(c, '10.0.0.1')).toEqual(418);
      const c6 = makeCtx(cfg([{address: '0:0:0:0:0:ffff:*', allowed: false}]));
      expect(utils.checkIpFilter(c6, '10.0.0.1')).toEqual(418);
    });

    test('matches the optional hostname, case-insensitively, with escaped dots', () => {
      const c = makeCtx(cfg([{address: '*.Example.com', allowed: false}]));
      expect(utils.checkIpFilter(c, '1.1.1.1', 'host.example.com')).toEqual(418);
      expect(utils.checkIpFilter(c, '1.1.1.1', 'hostXexample.com')).toEqual(0);
      expect(utils.checkIpFilter(c, '1.1.1.1')).toEqual(0);
    });
  });

  describe('getBaseUrlByRequest', () => {
    const logCtx = new operationContext.Context();

    test('uses the request protocol and host header', () => {
      expect(utils.getBaseUrlByRequest(logCtx, fakeReq({host: 'example.com:8080'}, 'https'))).toEqual('https://example.com:8080');
    });

    test('forwarded headers take priority, first comma-separated value only', () => {
      const req = fakeReq(
        {
          'host': 'internal',
          'x-forwarded-proto': 'https, http',
          'x-forwarded-host': 'public.com, other.com',
          'x-forwarded-prefix': '/pfx, /other'
        },
        'http'
      );
      expect(utils.getBaseUrlByRequest(logCtx, req)).toEqual('https://public.com/pfx');
    });

    test('cloudfront-forwarded-proto wins over x-forwarded-proto', () => {
      const req = fakeReq({'host': 'h', 'cloudfront-forwarded-proto': 'https', 'x-forwarded-proto': 'http'}, 'http');
      expect(utils.getBaseUrlByRequest(logCtx, req)).toEqual('https://h');
    });

    test('invalid protocols fall back to the request protocol, then to http', () => {
      expect(utils.getBaseUrlByRequest(logCtx, fakeReq({'host': 'h', 'x-forwarded-proto': 'javascript'}, 'https'))).toEqual('https://h');
      expect(utils.getBaseUrlByRequest(logCtx, fakeReq({'host': 'h', 'x-forwarded-proto': 'ftp'}, 'ws'))).toEqual('http://h');
      expect(utils.getBaseUrlByRequest(logCtx, fakeReq({host: 'h'}, undefined))).toEqual('http://h');
      // the protocol case is preserved
      expect(utils.getBaseUrlByRequest(logCtx, fakeReq({'host': 'h', 'x-forwarded-proto': 'HTTPS'}, 'http'))).toEqual('HTTPS://h');
    });

    test('a request without a get function throws', () => {
      expect(() => utils.getBaseUrlByRequest(logCtx, {protocol: 'http'})).toThrow(TypeError);
    });
  });
});
