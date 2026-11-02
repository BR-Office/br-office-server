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

const {describe, test, expect, jest, beforeEach} = require('@jest/globals');
const jwt = require('../../Common/node_modules/jsonwebtoken');

// Infrastructure modules pulled in by DocsCoServer.js: mocked so it loads without DB/RabbitMQ/storage.
jest.mock('../../Common/sources/storage/storage-base', () => ({}));
jest.mock('../../DocService/sources/databaseConnectors/baseConnector', () => ({}));
jest.mock('../../DocService/sources/canvasservice', () => ({}));
jest.mock('../../DocService/sources/converterservice', () => ({}));
jest.mock('../../DocService/sources/taskresult', () => ({}));
jest.mock('../../DocService/sources/gc', () => ({getCronStep: () => 60000}));
jest.mock('../../DocService/sources/shutdown', () => ({}));
jest.mock('../../DocService/sources/pubsubRabbitMQ', () => ({}));
jest.mock('../../DocService/sources/wopiClient', () => ({}));
jest.mock('../../Common/sources/taskqueueRabbitMQ', () => ({}));
jest.mock('../../DocService/sources/ai/aiProxyHandler', () => ({}));

// operationContext must load before tenantManager: the two require each other and only this order works.
require('../../Common/sources/operationContext');
const constants = require('../../Common/sources/constants');
const commonDefines = require('../../Common/sources/commondefines');
const tenantManager = require('../../Common/sources/tenantManager');
const utils = require('../../Common/sources/utils');

let docsCoServer;
let loadError = null;
try {
  docsCoServer = require('../../DocService/sources/DocsCoServer');
} catch (err) {
  loadError = err;
}

const SECRET = 'test-secret';

function makeCtx(cfg = {}) {
  return {
    logger: {debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn()},
    getCfg: jest.fn((key, def) => (key in cfg ? cfg[key] : def))
  };
}

function makeReq({headers = {}, body, query = {}} = {}) {
  const lower = {};
  Object.keys(headers).forEach(k => (lower[k.toLowerCase()] = headers[k]));
  return {get: name => lower[name.toLowerCase()], body, query};
}

describe('DocsCoServer module loading', () => {
  test('loads with infrastructure mocked', () => {
    expect(loadError).toBeNull();
    expect(typeof docsCoServer.checkJwt).toBe('function');
  });
});

const describeIfLoaded = loadError ? describe.skip : describe;

describeIfLoaded('DocsCoServer helpers', () => {
  // tenantManager cannot be jest.mock-ed wholesale (circular require with operationContext), so spy on it.
  beforeEach(() => {
    jest.spyOn(tenantManager, 'getTenantSecret').mockResolvedValue(SECRET);
  });

  describe('getOpenFormatByEditor', () => {
    test.each([
      [1, constants.AVS_OFFICESTUDIO_FILE_CANVAS_SPREADSHEET],
      [2, constants.AVS_OFFICESTUDIO_FILE_CANVAS_PRESENTATION],
      [3, constants.AVS_OFFICESTUDIO_FILE_DRAW_VSDX],
      [0, constants.AVS_OFFICESTUDIO_FILE_CANVAS_WORD],
      [undefined, constants.AVS_OFFICESTUDIO_FILE_CANVAS_WORD],
      [99, constants.AVS_OFFICESTUDIO_FILE_CANVAS_WORD],
      ['1', constants.AVS_OFFICESTUDIO_FILE_CANVAS_WORD]
    ])('editor type %p', (type, expected) => {
      expect(docsCoServer.getOpenFormatByEditor(type)).toBe(expected);
    });
  });

  describe('checkJwt', () => {
    test('valid token is decoded', async () => {
      const token = jwt.sign({a: 1}, SECRET);
      const res = await docsCoServer.checkJwt(makeCtx(), token, commonDefines.c_oAscSecretType.Inbox);
      expect(res.decoded.a).toBe(1);
      expect(res.code).toBeNull();
      expect(res.description).toBeNull();
      expect(res.token).toBe(token);
      expect(tenantManager.getTenantSecret).toHaveBeenCalledWith(expect.anything(), commonDefines.c_oAscSecretType.Inbox);
    });

    test('expired token yields JWT_EXPIRED_CODE', async () => {
      const token = jwt.sign({a: 1, exp: Math.floor(Date.now() / 1000) - 60}, SECRET);
      const res = await docsCoServer.checkJwt(makeCtx(), token, 0);
      expect(res.decoded).toBeNull();
      expect(res.code).toBe(constants.JWT_EXPIRED_CODE);
      expect(res.description.startsWith(constants.JWT_EXPIRED_REASON)).toBe(true);
    });

    test('wrong signature yields JWT_ERROR_CODE', async () => {
      const token = jwt.sign({a: 1}, 'other-secret');
      const res = await docsCoServer.checkJwt(makeCtx(), token, 0);
      expect(res.decoded).toBeNull();
      expect(res.code).toBe(constants.JWT_ERROR_CODE);
      expect(res.description.startsWith(constants.JWT_ERROR_REASON)).toBe(true);
    });

    test('malformed token yields JWT_ERROR_CODE', async () => {
      const res = await docsCoServer.checkJwt(makeCtx(), 'not-a-jwt', 0);
      expect(res.decoded).toBeNull();
      expect(res.code).toBe(constants.JWT_ERROR_CODE);
    });

    test('missing secret is logged and token is rejected', async () => {
      tenantManager.getTenantSecret.mockResolvedValue(undefined);
      const ctx = makeCtx();
      const res = await docsCoServer.checkJwt(ctx, jwt.sign({a: 1}, SECRET), 0);
      expect(ctx.logger.warn).toHaveBeenCalled();
      expect(res.decoded).toBeNull();
      expect(res.code).not.toBeNull();
    });
  });

  describe('checkJwtHeader', () => {
    const header = 'Authorization';
    const prefix = 'Bearer ';

    test('returns null without header', async () => {
      const res = await docsCoServer.checkJwtHeader(makeCtx(), makeReq(), header, prefix);
      expect(res).toBeNull();
    });

    test('returns null when prefix does not match', async () => {
      const req = makeReq({headers: {Authorization: 'Basic abc'}});
      expect(await docsCoServer.checkJwtHeader(makeCtx(), req, header, prefix)).toBeNull();
    });

    test('strips explicit prefix and verifies token', async () => {
      const token = jwt.sign({b: 2}, SECRET);
      const req = makeReq({headers: {Authorization: prefix + token}});
      const res = await docsCoServer.checkJwtHeader(makeCtx(), req, header, prefix);
      expect(res.decoded.b).toBe(2);
      expect(res.token).toBe(token);
      expect(tenantManager.getTenantSecret).toHaveBeenCalledWith(expect.anything(), commonDefines.c_oAscSecretType.Inbox);
    });

    test('uses configured header/prefix by default and custom secret type', async () => {
      const token = jwt.sign({c: 3}, SECRET);
      const ctx = makeCtx({'services.CoAuthoring.token.inbox.header': 'X-Tok', 'services.CoAuthoring.token.inbox.prefix': 'T '});
      const req = makeReq({headers: {'X-Tok': 'T ' + token}});
      const res = await docsCoServer.checkJwtHeader(ctx, req, undefined, undefined, commonDefines.c_oAscSecretType.Outbox);
      expect(res.decoded.c).toBe(3);
      expect(tenantManager.getTenantSecret).toHaveBeenCalledWith(expect.anything(), commonDefines.c_oAscSecretType.Outbox);
    });
  });

  describe('getRequestParams', () => {
    const off = {'services.CoAuthoring.token.enable.request.inbox': false};
    const on = {'services.CoAuthoring.token.enable.request.inbox': true, 'services.CoAuthoring.server.tokenRequiredParams': false};

    test('token disabled: parses JSON buffer body', async () => {
      const req = makeReq({body: Buffer.from('{"k":"v"}'), query: {q: 1}});
      const res = await docsCoServer.getRequestParams(makeCtx(off), req);
      expect(res).toEqual({code: constants.NO_ERROR, description: '', isDecoded: false, params: {k: 'v'}});
    });

    test('token disabled: invalid JSON body falls back to query', async () => {
      const req = makeReq({body: Buffer.from('{bad'), query: {q: 1}});
      const res = await docsCoServer.getRequestParams(makeCtx(off), req);
      expect(res.params).toEqual({q: 1});
      expect(res.code).toBe(constants.NO_ERROR);
    });

    test('token disabled: empty or non-buffer body falls back to query', async () => {
      const q = {q: 2};
      expect((await docsCoServer.getRequestParams(makeCtx(off), makeReq({body: Buffer.alloc(0), query: q}))).params).toBe(q);
      expect((await docsCoServer.getRequestParams(makeCtx(off), makeReq({body: {x: 1}, query: q}))).params).toBe(q);
    });

    test('token enabled, no token: VKEY code', async () => {
      const res = await docsCoServer.getRequestParams(makeCtx(on), makeReq({query: {}}));
      expect(res.code).toBe(constants.VKEY);
      expect(res.isDecoded).toBe(false);
    });

    test('token enabled, token in params: decoded and merged with payload/query', async () => {
      const token = jwt.sign({own: 1, payload: {p: 2}, query: {z: 3}}, SECRET);
      const res = await docsCoServer.getRequestParams(makeCtx(on), makeReq({query: {token, keep: 'me'}}));
      expect(res.code).toBe(constants.NO_ERROR);
      expect(res.isDecoded).toBe(true);
      expect(res.params).toMatchObject({token, keep: 'me', own: 1, p: 2, z: 3});
    });

    test('token enabled, tokenRequiredParams: only decoded values kept', async () => {
      const cfg = {...on, 'services.CoAuthoring.server.tokenRequiredParams': true};
      const token = jwt.sign({own: 1}, SECRET);
      const res = await docsCoServer.getRequestParams(makeCtx(cfg), makeReq({query: {token, drop: 'x'}}));
      expect(res.params.drop).toBeUndefined();
      expect(res.params.own).toBe(1);
    });

    test('token enabled, token in header', async () => {
      const token = jwt.sign({h: 1}, SECRET);
      const cfg = {...on, 'services.CoAuthoring.token.inbox.header': 'Authorization', 'services.CoAuthoring.token.inbox.prefix': 'Bearer '};
      const req = makeReq({headers: {Authorization: 'Bearer ' + token}, query: {}});
      const res = await docsCoServer.getRequestParams(makeCtx(cfg), req);
      expect(res.code).toBe(constants.NO_ERROR);
      expect(res.params.h).toBe(1);
    });

    test('token enabled, expired token: VKEY_KEY_EXPIRE', async () => {
      const token = jwt.sign({exp: Math.floor(Date.now() / 1000) - 60}, SECRET);
      const res = await docsCoServer.getRequestParams(makeCtx(on), makeReq({query: {token}}));
      expect(res.code).toBe(constants.VKEY_KEY_EXPIRE);
      expect(res.isDecoded).toBe(false);
      expect(res.description.startsWith(constants.JWT_EXPIRED_REASON)).toBe(true);
    });

    test('token enabled, invalid token: stays VKEY with description', async () => {
      const token = jwt.sign({a: 1}, 'other');
      const res = await docsCoServer.getRequestParams(makeCtx(on), makeReq({query: {token}}));
      expect(res.code).toBe(constants.VKEY);
      expect(res.description.startsWith(constants.JWT_ERROR_REASON)).toBe(true);
    });
  });

  describe('encryptPasswordParams', () => {
    let spy;
    beforeEach(() => {
      spy = jest.spyOn(utils, 'encryptPassword').mockImplementation(async (ctx, pwd) => 'enc:' + pwd);
    });

    test('openDocument: encrypts message.password and savepassword', async () => {
      const data = {type: 'openDocument', message: {password: 'a', savepassword: 'b'}};
      await docsCoServer.encryptPasswordParams(makeCtx(), data);
      expect(data.message).toEqual({password: 'enc:a', savepassword: 'enc:b'});
    });

    test('auth: encrypts openCmd.password', async () => {
      const data = {type: 'auth', openCmd: {password: 'a'}};
      await docsCoServer.encryptPasswordParams(makeCtx(), data);
      expect(data.openCmd.password).toBe('enc:a');
    });

    test('too long passwords are nulled and logged', async () => {
      const long = 'x'.repeat(constants.PASSWORD_MAX_LENGTH + 1);
      const ctx = makeCtx();
      const data = {type: 'openDocument', message: {password: long, savepassword: long}};
      await docsCoServer.encryptPasswordParams(ctx, data);
      expect(data.message).toEqual({password: null, savepassword: null});
      expect(ctx.logger.warn).toHaveBeenCalledTimes(2);
      expect(spy).not.toHaveBeenCalled();
    });

    test('password of exactly max length is encrypted', async () => {
      const max = 'x'.repeat(constants.PASSWORD_MAX_LENGTH);
      const data = {type: 'openDocument', message: {password: max}};
      await docsCoServer.encryptPasswordParams(makeCtx(), data);
      expect(data.message.password).toBe('enc:' + max);
    });

    test('other types or missing payload are untouched', async () => {
      const a = {type: 'other', message: {password: 'a'}};
      const b = {type: 'openDocument'};
      const c = {type: 'auth'};
      await docsCoServer.encryptPasswordParams(makeCtx(), a);
      await docsCoServer.encryptPasswordParams(makeCtx(), b);
      await docsCoServer.encryptPasswordParams(makeCtx(), c);
      expect(a.message.password).toBe('a');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
