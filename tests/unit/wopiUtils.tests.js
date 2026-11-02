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

'use strict';

// Characterization tests (PKT-0012): they pin what wopiUtils does today,
// including surprising behavior, before the module is migrated.

const crypto = require('crypto');
const {describe, test, expect, beforeAll} = require('@jest/globals');
const config = require('../../Common/node_modules/config');
const operationContext = require('./../../Common/sources/operationContext');
const utils = require('./../../Common/sources/utils');
const commonDefines = require('./../../Common/sources/commondefines');
const wopiUtils = require('./../../DocService/sources/wopiUtils');

const MAX_DOWNLOAD_BYTES = config.get('FileConverter.converter.maxDownloadBytes');
const CLIENT_VERSION = commonDefines.buildVersion + '.' + commonDefines.buildNumber;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Minimal context: getCfg returns overrides by key, otherwise the module default.
 */
function makeCtx(overrides = {}, ...rest) {
  return {
    userSessionId: rest.length ? rest[0] : 'session-1',
    getCfg(property, defaultValue) {
      return Object.prototype.hasOwnProperty.call(overrides, property) ? overrides[property] : defaultValue;
    },
    logger: {debug() {}}
  };
}

/**
 * Independent re-implementation of the documented WOPI proof layout:
 * [4B BE len(token)][token utf8][4B BE len(URL)][URL upper-cased utf8][4B BE 8][8B BE timestamp]
 */
function expectedProofBuffer(url, accessToken, timeStamp) {
  const token = Buffer.from(accessToken, 'utf8');
  const urlBytes = Buffer.from(url.toUpperCase(), 'utf8');
  const lenToken = Buffer.alloc(4);
  lenToken.writeUInt32BE(token.length);
  const lenUrl = Buffer.alloc(4);
  lenUrl.writeUInt32BE(urlBytes.length);
  const lenTs = Buffer.alloc(4);
  lenTs.writeUInt32BE(8);
  const ts = Buffer.alloc(8);
  ts.writeBigUInt64BE(timeStamp);
  return Buffer.concat([lenToken, token, lenUrl, urlBytes, lenTs, ts]);
}

function verify(buffer, signatureBase64, publicKey) {
  return crypto.verify('RSA-SHA256', buffer, publicKey, Buffer.from(signatureBase64, 'base64'));
}

describe('wopiUtils', () => {
  let current;
  let old;

  beforeAll(() => {
    const opts = {
      modulusLength: 2048,
      publicKeyEncoding: {type: 'spki', format: 'pem'},
      privateKeyEncoding: {type: 'pkcs8', format: 'pem'}
    };
    current = crypto.generateKeyPairSync('rsa', opts);
    old = crypto.generateKeyPairSync('rsa', opts);
  });

  function keyedCtx(userSessionId) {
    return makeCtx({'wopi.privateKey': current.privateKey, 'wopi.privateKeyOld': old.privateKey}, userSessionId);
  }

  test('exports only getWopiFileUrl and fillStandardHeaders', () => {
    expect(Object.keys(wopiUtils).sort()).toEqual(['fillStandardHeaders', 'getWopiFileUrl']);
  });

  describe('fillStandardHeaders', () => {
    test('without proof keys (test config): sets timestamp, version, correlation and session headers only', async () => {
      const headers = {};
      const before = utils.getDateTimeTicks(new Date());
      const result = await wopiUtils.fillStandardHeaders(makeCtx(), headers, 'https://host/wopi/files/1', 'tok');
      const after = utils.getDateTimeTicks(new Date());

      expect(result).toBeUndefined();
      expect(Object.keys(headers).sort()).toEqual([
        'X-WOPI-ClientVersion',
        'X-WOPI-CorrelationId',
        'X-WOPI-SessionId',
        'X-WOPI-TimeStamp'
      ]);
      // Surprise: the timestamp is a BigInt (.NET ticks), not a string.
      expect(typeof headers['X-WOPI-TimeStamp']).toBe('bigint');
      expect(headers['X-WOPI-TimeStamp'] >= before && headers['X-WOPI-TimeStamp'] <= after).toBe(true);
      expect(headers['X-WOPI-ClientVersion']).toBe(CLIENT_VERSION);
      expect(headers['X-WOPI-CorrelationId']).toMatch(UUID_RE);
      expect(headers['X-WOPI-SessionId']).toBe('session-1');
      // The Authorization header is intentionally not sent.
      expect(headers).not.toHaveProperty('Authorization');
    });

    test('uses the real test config: wopi keys are empty, so no proof headers', async () => {
      expect(config.get('wopi.privateKey')).toBeFalsy();
      const headers = {};
      await wopiUtils.fillStandardHeaders(operationContext.global, headers, 'https://host/x', 'tok');
      expect(headers).not.toHaveProperty('X-WOPI-Proof');
      expect(headers).not.toHaveProperty('X-WOPI-ProofOld');
      expect(headers).toHaveProperty('X-WOPI-TimeStamp');
    });

    test('generates a new correlation id on each call', async () => {
      const a = {};
      const b = {};
      await wopiUtils.fillStandardHeaders(makeCtx(), a, 'https://h/x', 't');
      await wopiUtils.fillStandardHeaders(makeCtx(), b, 'https://h/x', 't');
      expect(a['X-WOPI-CorrelationId']).not.toBe(b['X-WOPI-CorrelationId']);
    });

    test('mutates the given object, keeps unrelated headers and overwrites WOPI ones', async () => {
      const headers = {'X-Custom': 'keep', 'X-WOPI-SessionId': 'stale'};
      await wopiUtils.fillStandardHeaders(makeCtx(), headers, 'https://h/x', 't');
      expect(headers['X-Custom']).toBe('keep');
      expect(headers['X-WOPI-SessionId']).toBe('session-1');
    });

    test('surprise: undefined userSessionId still sets the X-WOPI-SessionId key (to undefined)', async () => {
      const headers = {};
      await wopiUtils.fillStandardHeaders(makeCtx({}, undefined), headers, 'https://h/x', 't');
      expect(Object.prototype.hasOwnProperty.call(headers, 'X-WOPI-SessionId')).toBe(true);
      expect(headers['X-WOPI-SessionId']).toBeUndefined();
    });

    test('with both keys: adds X-WOPI-Proof and X-WOPI-ProofOld signed over the documented layout', async () => {
      const url = 'https://Host.example/wopi/files/ABC/contents?access_token=t%C3%A9k';
      const token = 'ték';
      const headers = {};
      await wopiUtils.fillStandardHeaders(keyedCtx(), headers, url, token);

      expect(Object.keys(headers).sort()).toEqual([
        'X-WOPI-ClientVersion',
        'X-WOPI-CorrelationId',
        'X-WOPI-Proof',
        'X-WOPI-ProofOld',
        'X-WOPI-SessionId',
        'X-WOPI-TimeStamp'
      ]);
      const ts = headers['X-WOPI-TimeStamp'];
      const buffer = expectedProofBuffer(url, token, ts);
      // Layout: token length is the UTF-8 byte length (4 for "ték"), URL is upper-cased.
      expect(buffer.readUInt32BE(0)).toBe(4);
      expect(buffer.subarray(8 + 4, 8 + 4 + url.length).toString('utf8')).toBe(url.toUpperCase());
      expect(buffer.length).toBe(4 + 4 + 4 + Buffer.byteLength(url) + 4 + 8);

      expect(verify(buffer, headers['X-WOPI-Proof'], current.publicKey)).toBe(true);
      expect(verify(buffer, headers['X-WOPI-ProofOld'], old.publicKey)).toBe(true);
      // Each proof is signed with its own key.
      expect(verify(buffer, headers['X-WOPI-Proof'], old.publicKey)).toBe(false);
      expect(verify(buffer, headers['X-WOPI-ProofOld'], current.publicKey)).toBe(false);
    });

    test('proof does not verify against the original-case URL or a different timestamp', async () => {
      const url = 'https://host/wopi/files/abc';
      const headers = {};
      await wopiUtils.fillStandardHeaders(keyedCtx(), headers, url, 'tok');
      const ts = headers['X-WOPI-TimeStamp'];
      const lowerCaseLayout = Buffer.from(expectedProofBuffer(url, 'tok', ts));
      Buffer.from(url, 'utf8').copy(lowerCaseLayout, 4 + 3 + 4);
      expect(verify(lowerCaseLayout, headers['X-WOPI-Proof'], current.publicKey)).toBe(false);
      expect(verify(expectedProofBuffer(url, 'tok', ts + 1n), headers['X-WOPI-Proof'], current.publicKey)).toBe(false);
    });

    test.each([
      ['only privateKey', {'wopi.privateKey': 'K', 'wopi.privateKeyOld': ''}],
      ['only privateKeyOld', {'wopi.privateKey': '', 'wopi.privateKeyOld': 'K'}]
    ])('with %s: no proof headers at all (both keys are required)', async (_name, overrides) => {
      const headers = {};
      await wopiUtils.fillStandardHeaders(makeCtx(overrides), headers, 'https://h/x', 't');
      expect(headers).not.toHaveProperty('X-WOPI-Proof');
      expect(headers).not.toHaveProperty('X-WOPI-ProofOld');
    });

    test('surprise: with keys and an undefined access token, it rejects (Buffer.from(undefined))', async () => {
      await expect(wopiUtils.fillStandardHeaders(keyedCtx(), {}, 'https://h/x', undefined)).rejects.toThrow(/first argument must be of type string/);
    });
  });

  describe('getWopiFileUrl', () => {
    const userAuth = {wopiSrc: 'https://host/wopi/files/42', access_token: 'a b&c=d/é'};
    const builtUrl = 'https://host/wopi/files/42/contents?access_token=a%20b%26c%3Dd%2F%C3%A9';

    test('FileUrl wins over TemplateSource and wopiSrc; no standard or proof headers', async () => {
      const fileInfo = {FileUrl: 'https://files/direct', TemplateSource: 'https://files/template'};
      const res = await wopiUtils.getWopiFileUrl(keyedCtx(), fileInfo, userAuth);
      expect(res).toEqual({url: 'https://files/direct', headers: {'X-WOPI-MaxExpectedSize': MAX_DOWNLOAD_BYTES}});
    });

    test('TemplateSource wins over wopiSrc; no standard or proof headers', async () => {
      const res = await wopiUtils.getWopiFileUrl(keyedCtx(), {TemplateSource: 'https://files/template'}, userAuth);
      expect(res).toEqual({url: 'https://files/template', headers: {'X-WOPI-MaxExpectedSize': MAX_DOWNLOAD_BYTES}});
    });

    test('falls back to wopiSrc/contents with the encoded access token, and signs that URL', async () => {
      const res = await wopiUtils.getWopiFileUrl(keyedCtx('s-9'), {}, userAuth);
      expect(res.url).toBe(builtUrl);
      expect(Object.keys(res.headers).sort()).toEqual([
        'X-WOPI-ClientVersion',
        'X-WOPI-CorrelationId',
        'X-WOPI-MaxExpectedSize',
        'X-WOPI-Proof',
        'X-WOPI-ProofOld',
        'X-WOPI-SessionId',
        'X-WOPI-TimeStamp'
      ]);
      expect(res.headers['X-WOPI-MaxExpectedSize']).toBe(MAX_DOWNLOAD_BYTES);
      expect(res.headers['X-WOPI-SessionId']).toBe('s-9');
      // Proof is over the full built URL (encoded token in the query) and the raw token.
      const buffer = expectedProofBuffer(builtUrl, userAuth.access_token, res.headers['X-WOPI-TimeStamp']);
      expect(verify(buffer, res.headers['X-WOPI-Proof'], current.publicKey)).toBe(true);
      expect(verify(buffer, res.headers['X-WOPI-ProofOld'], old.publicKey)).toBe(true);
    });

    test('empty FileUrl and TemplateSource are falsy and fall through to wopiSrc', async () => {
      const res = await wopiUtils.getWopiFileUrl(makeCtx(), {FileUrl: '', TemplateSource: ''}, userAuth);
      expect(res.url).toBe(builtUrl);
    });

    test('null/undefined fileInfo is tolerated (optional chaining)', async () => {
      expect((await wopiUtils.getWopiFileUrl(makeCtx(), null, userAuth)).url).toBe(builtUrl);
      expect((await wopiUtils.getWopiFileUrl(makeCtx(), undefined, userAuth)).url).toBe(builtUrl);
    });

    test('surprise: with the real logger at debug level, the wopiSrc path rejects (BigInt in %j)', async () => {
      // The test config logs at DEBUG; the debug line formats headers with %j and
      // X-WOPI-TimeStamp is a BigInt, so JSON serialization throws after the headers are built.
      await expect(wopiUtils.getWopiFileUrl(operationContext.global, {}, userAuth)).rejects.toThrow(
        'Do not know how to serialize a BigInt'
      );
    });

    test('with the real logger, the FileUrl path logs fine (no BigInt header)', async () => {
      const res = await wopiUtils.getWopiFileUrl(operationContext.global, {FileUrl: 'https://f'}, userAuth);
      expect(res).toEqual({url: 'https://f', headers: {'X-WOPI-MaxExpectedSize': MAX_DOWNLOAD_BYTES}});
    });

    test('without keys: wopiSrc fallback has standard headers but no proof', async () => {
      const res = await wopiUtils.getWopiFileUrl(makeCtx(), {}, userAuth);
      expect(res.url).toBe(builtUrl);
      expect(res.headers).not.toHaveProperty('X-WOPI-Proof');
      expect(res.headers).not.toHaveProperty('X-WOPI-ProofOld');
      expect(res.headers['X-WOPI-MaxExpectedSize']).toBe(MAX_DOWNLOAD_BYTES);
      expect(res.headers['X-WOPI-ClientVersion']).toBe(CLIENT_VERSION);
    });

    test('no source at all: url is undefined and only X-WOPI-MaxExpectedSize is set', async () => {
      const res = await wopiUtils.getWopiFileUrl(makeCtx(), {}, null);
      expect(res).toEqual({url: undefined, headers: {'X-WOPI-MaxExpectedSize': MAX_DOWNLOAD_BYTES}});
    });

    test('X-WOPI-MaxExpectedSize comes from the tenant config when overridden', async () => {
      const ctx = makeCtx({'FileConverter.converter.maxDownloadBytes': 1234});
      const res = await wopiUtils.getWopiFileUrl(ctx, {FileUrl: 'https://f'}, null);
      expect(res.headers['X-WOPI-MaxExpectedSize']).toBe(1234);
    });

    test('surprise: missing access_token is stringified into the URL as "undefined" (no keys)', async () => {
      const res = await wopiUtils.getWopiFileUrl(makeCtx(), {}, {wopiSrc: 'https://h/w'});
      expect(res.url).toBe('https://h/w/contents?access_token=undefined');
    });
  });
});
