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

// Characterization tests (PKT-0007): pin the current behaviour of Common/sources/operationContext.js.

const {describe, test, expect, jest, afterEach} = require('@jest/globals');

const operationContext = require('../../Common/sources/operationContext');
const tenantManager = require('../../Common/sources/tenantManager');
const runtimeConfigManager = require('../../Common/sources/runtimeConfigManager');
const moduleReloader = require('../../Common/sources/moduleReloader');
const commondefines = require('../../Common/sources/commondefines');
const constants = require('../../Common/sources/constants');

const {Context} = operationContext;

afterEach(() => {
  jest.restoreAllMocks();
  operationContext.global.cleanRuntimeConfigCache();
});

function fullContext() {
  const ctx = new Context();
  ctx.init('tenant1', 'doc1', 'user1', 'shard1', 'http://wopi/src', 'sess1');
  return ctx;
}

describe('Context wire format', () => {
  test('toJSON exposes exactly the six cross-service fields, in order', () => {
    const json = fullContext().toJSON();
    expect(json).toEqual({
      tenant: 'tenant1',
      docId: 'doc1',
      userId: 'user1',
      userSessionId: 'sess1',
      shardKey: 'shard1',
      wopiSrc: 'http://wopi/src'
    });
    expect(Object.keys(json)).toEqual(['tenant', 'docId', 'userId', 'userSessionId', 'shardKey', 'wopiSrc']);
  });

  test('serialization does not leak config, secret or license', () => {
    const ctx = fullContext();
    ctx.config = {a: 1};
    ctx.secret = 's';
    ctx.license = 'l';
    const json = JSON.parse(JSON.stringify(ctx));
    expect(json).not.toHaveProperty('config');
    expect(json).not.toHaveProperty('secret');
    expect(json).not.toHaveProperty('license');
  });

  test('round-trips through TaskQueueData JSON and initFromTaskQueueData', () => {
    const src = fullContext();
    const task = new commondefines.TaskQueueData();
    task.setCtx(src);
    const received = new commondefines.TaskQueueData(JSON.parse(JSON.stringify(task)));

    const dst = new Context();
    dst.initFromTaskQueueData(received);
    expect(dst.toJSON()).toEqual(src.toJSON());
  });

  test('round-trips through initFromPubSub', () => {
    const src = fullContext();
    const dst = new Context();
    dst.initFromPubSub(JSON.parse(JSON.stringify({ctx: src})));
    expect(dst.toJSON()).toEqual(src.toJSON());
  });

  test('undefined optional fields are dropped from the JSON', () => {
    const src = new Context();
    src.init('tenant1', 'doc1', 'user1');
    expect(JSON.parse(JSON.stringify(src))).toEqual({tenant: 'tenant1', docId: 'doc1', userId: 'user1'});
  });

  test('init keeps a previous userSessionId when the new one is falsy (current behaviour)', () => {
    const ctx = fullContext();
    ctx.init('t2', 'd2', 'u2');
    expect(ctx.userSessionId).toBe('sess1');
  });

  test('init resets config, secret, license and taskResultCache', () => {
    const ctx = new Context();
    ctx.config = {a: 1};
    ctx.secret = 's';
    ctx.license = 'l';
    ctx.taskResultCache = {};
    ctx.init('t', 'd', 'u');
    expect(ctx.config).toBeNull();
    expect(ctx.secret).toBeNull();
    expect(ctx.license).toBeNull();
    expect(ctx.taskResultCache).toBeNull();
  });

  test('a new Context starts with the default tenant, docId and userId', () => {
    const ctx = new Context();
    expect(ctx.tenant).toBe(tenantManager.getDefautTenant());
    expect(ctx.docId).toBe(constants.DEFAULT_DOC_ID);
    expect(ctx.userId).toBe(constants.DEFAULT_USER_ID);
  });
});

describe('initFromRequest', () => {
  test('takes tenant from tenantManager and shardkey/WOPISrc/usid from query, keeps docId/userId', () => {
    jest.spyOn(tenantManager, 'getTenantByRequest').mockReturnValue('reqTenant');
    const ctx = new Context();
    ctx.init('old', 'doc1', 'user1');
    const query = {};
    query[constants.SHARD_KEY_API_NAME] = 'shard1';
    query[constants.SHARD_KEY_WOPI_NAME] = 'http://wopi/src';
    query[constants.USER_SESSION_ID_NAME] = 'sess1';
    ctx.initFromRequest({query});
    expect(ctx.toJSON()).toEqual({
      tenant: 'reqTenant',
      docId: 'doc1',
      userId: 'user1',
      userSessionId: 'sess1',
      shardKey: 'shard1',
      wopiSrc: 'http://wopi/src'
    });
  });

  test('without query, shardKey and wopiSrc are reset to undefined', () => {
    jest.spyOn(tenantManager, 'getTenantByRequest').mockReturnValue('reqTenant');
    const ctx = new Context();
    ctx.init('old', 'doc1', 'user1', 'shard0', 'wopi0');
    ctx.initFromRequest({});
    expect(ctx.tenant).toBe('reqTenant');
    expect(ctx.shardKey).toBeUndefined();
    expect(ctx.wopiSrc).toBeUndefined();
  });

  test('in single-tenant mode (test config) the tenant is the default tenant whatever the host', () => {
    const ctx = new Context();
    ctx.initFromRequest({headers: {host: 'other.example.com'}, query: {}});
    expect(ctx.tenant).toBe(tenantManager.getDefautTenant());
  });
});

describe('getCfg precedence', () => {
  function mockLayers(base, runtime, tenant) {
    jest.spyOn(moduleReloader, 'getBaseConfig').mockReturnValue(base);
    jest.spyOn(runtimeConfigManager, 'getConfig').mockResolvedValue(runtime);
    jest.spyOn(tenantManager, 'getTenantConfig').mockResolvedValue(tenant);
  }

  async function loadedContext(tenant) {
    const ctx = new Context();
    ctx.init(tenant, 'd', 'u');
    await ctx.initTenantCache();
    return ctx;
  }

  test('tenant overrides runtime, runtime overrides base', async () => {
    mockLayers({a: {x: 'base', y: 'base', z: 'base'}}, {a: {y: 'runtime', z: 'runtime'}}, {a: {z: 'tenant'}});
    const ctx = await loadedContext('tA');
    expect(ctx.getCfg('a.x')).toBe('base');
    expect(ctx.getCfg('a.y')).toBe('runtime');
    expect(ctx.getCfg('a.z')).toBe('tenant');
  });

  test('null runtime and tenant configs fall back to base', async () => {
    mockLayers({a: {x: 'base'}}, null, null);
    const ctx = await loadedContext('tB');
    expect(ctx.getCfg('a.x')).toBe('base');
  });

  test('getCfg returns defaultValue for missing keys and before config is loaded', async () => {
    expect(new Context().getCfg('a.x', 'dflt')).toBe('dflt');
    mockLayers({a: {x: 'base'}}, null, null);
    const ctx = await loadedContext('tC');
    expect(ctx.getCfg('a.missing', 'dflt')).toBe('dflt');
  });

  test('persistentStorage inherits from storage after the merge', async () => {
    mockLayers({storage: {name: 'fs', bucket: 'b1'}, persistentStorage: {bucket: 'b2'}}, null, null);
    const ctx = await loadedContext('tD');
    expect(ctx.getCfg('persistentStorage')).toEqual({name: 'fs', bucket: 'b2'});
  });

  test('merged config is cached per tenant until cleanTenantConfigCache', async () => {
    mockLayers({a: {x: 'v1'}}, null, null);
    await loadedContext('tE');

    moduleReloader.getBaseConfig.mockReturnValue({a: {x: 'v2'}});
    const cached = await loadedContext('tE');
    expect(cached.getCfg('a.x')).toBe('v1');

    cached.cleanTenantConfigCache('tE');
    const reloaded = await loadedContext('tE');
    expect(reloaded.getCfg('a.x')).toBe('v2');
  });
});
