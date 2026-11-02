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

/*
 * Characterization tests for DocService/sources/editorDataMemory.js (PKT-0013).
 * They pin what the code does today. Surprising behaviors, recorded here and not fixed:
 *  - setEditorConnections prunes with `tenantStat[i] < now - precision.val`, comparing an
 *    object to a number (always false), so samples are never pruned.
 *  - lockNotification uses NaN as the fencing token (NaN !== NaN), so the lock is not
 *    re-entrant: a second call within the ttl fails even from the same caller.
 *  - getdelSaved returns undefined the first time (never set) and null after a get-and-delete.
 *  - getViewerConnectionsCount counts conn.isCloseCoAuthoring connections without a tenant
 *    check, unlike getEditorConnectionsCount which excludes them.
 *  - removeAllLocks/removeMessages/removeForceSave store undefined instead of deleting keys.
 *  - getForceSaveTimer deletes returned entries (get-and-delete) and uses a strict `<`.
 *  - Lock expiry is based on Date.now() (tested with fake timers).
 */

const {describe, test, expect, beforeEach, afterEach, jest} = require('@jest/globals');
const operationContext = require('./../../Common/sources/operationContext');
const commonDefines = require('./../../Common/sources/commondefines');
const {EditorData, EditorStat} = require('./../../DocService/sources/editorDataMemory');

const ctx = operationContext.global;
const otherCtx = {tenant: 'other-tenant'};

describe('EditorData (in-memory)', () => {
  let ed;
  beforeEach(() => {
    ed = new EditorData();
  });

  test('connection lifecycle helpers', async () => {
    expect(ed.isConnected()).toBe(true);
    expect(await ed.ping()).toBe('PONG');
    expect(await ed.healthCheck()).toBe(true);
    await expect(ed.connect()).resolves.toBeUndefined();
    await expect(ed.close()).resolves.toBeUndefined();
  });

  test('healthCheck returns false when not connected', async () => {
    ed.isConnected = () => false;
    expect(await ed.healthCheck()).toBe(false);
  });

  describe('presence', () => {
    test('add/update/remove presence are no-ops', async () => {
      expect(await ed.addPresence(ctx, 'd', 'u', {})).toBeUndefined();
      expect(await ed.updatePresence(ctx, 'd', 'u')).toBeUndefined();
      expect(await ed.removePresence(ctx, 'd', 'u')).toBeUndefined();
      expect(await ed.getPresence(ctx, 'd')).toEqual([]);
    });

    test('getPresence lists JSON strings of connections of the doc only', async () => {
      const conns = [
        {docId: 'd', id: 'c1', user: {id: 'u1', view: false}},
        {docId: 'other', id: 'c2', user: {id: 'u2'}},
        {docId: 'd', id: 'c3', user: {id: 'u3'}}
      ];
      const res = await ed.getPresence(ctx, 'd', conns);
      expect(res).toHaveLength(2);
      expect(res.every(s => typeof s === 'string')).toBe(true);
      expect(JSON.parse(res[0]).id).toBe('u1');
      expect(JSON.parse(res[1]).id).toBe('u3');
    });

    test('getDocumentPresenceExpired is always empty; removePresenceDocument is a no-op', async () => {
      expect(await ed.getDocumentPresenceExpired(Date.now())).toEqual([]);
      expect(await ed.removePresenceDocument(ctx, 'd')).toBeUndefined();
    });
  });

  describe('lockSave / lockAuth', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(1000000);
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test.each([
      ['lockSave', 'unlockSave'],
      ['lockAuth', 'unlockAuth']
    ])('%s grants, refuses another owner, allows same owner', async (lock, unlock) => {
      expect(await ed[lock](ctx, 'd', 'u1', 10)).toBe(true);
      expect(await ed[lock](ctx, 'd', 'u2', 10)).toBe(false);
      expect(await ed[lock](ctx, 'd', 'u1', 10)).toBe(true);
      expect(await ed[unlock](ctx, 'd', 'u2')).toBe(commonDefines.c_oAscUnlockRes.Locked);
      expect(await ed[unlock](ctx, 'd', 'u1')).toBe(commonDefines.c_oAscUnlockRes.Unlocked);
      expect(await ed[unlock](ctx, 'd', 'u1')).toBe(commonDefines.c_oAscUnlockRes.Empty);
    });

    test('lock expires after ttl seconds (strict boundary)', async () => {
      expect(await ed.lockSave(ctx, 'd', 'u1', 10)).toBe(true);
      jest.setSystemTime(1000000 + 9999);
      expect(await ed.lockSave(ctx, 'd', 'u2', 10)).toBe(false);
      jest.setSystemTime(1000000 + 10000);
      expect(await ed.lockSave(ctx, 'd', 'u2', 10)).toBe(true);
    });

    test('unlock of an expired lock returns Empty', async () => {
      await ed.lockAuth(ctx, 'd', 'u1', 1);
      jest.setSystemTime(1000000 + 5000);
      expect(await ed.unlockAuth(ctx, 'd', 'u1')).toBe(commonDefines.c_oAscUnlockRes.Empty);
    });

    test('lockSave and lockAuth are independent; locks are per doc and tenant', async () => {
      expect(await ed.lockSave(ctx, 'd', 'u1', 10)).toBe(true);
      expect(await ed.lockAuth(ctx, 'd', 'u2', 10)).toBe(true);
      expect(await ed.lockSave(ctx, 'd2', 'u2', 10)).toBe(true);
      expect(await ed.lockSave(otherCtx, 'd', 'u2', 10)).toBe(true);
    });
  });

  describe('locks', () => {
    test('getLocks returns empty object by default', async () => {
      expect(await ed.getLocks(ctx, 'd')).toEqual({});
    });

    test('addLocks merges and overwrites', async () => {
      await ed.addLocks(ctx, 'd', {a: 1, b: 2});
      await ed.addLocks(ctx, 'd', {b: 3, c: 4});
      expect(await ed.getLocks(ctx, 'd')).toEqual({a: 1, b: 3, c: 4});
    });

    test('addLocksNX only adds missing locks and reports conflicts', async () => {
      await ed.addLocks(ctx, 'd', {a: 1});
      const res = await ed.addLocksNX(ctx, 'd', {a: 9, b: 2});
      expect(res.lockConflict).toEqual({a: 9});
      expect(res.allLocks).toEqual({a: 1, b: 2});
      expect(await ed.getLocks(ctx, 'd')).toEqual({a: 1, b: 2});
    });

    test('addLocksNX without conflicts returns empty conflict', async () => {
      const res = await ed.addLocksNX(ctx, 'd', {a: 1});
      expect(res.lockConflict).toEqual({});
      expect(res.allLocks).toEqual({a: 1});
    });

    test('removeLocks deletes listed ids; tolerates missing locks', async () => {
      await expect(ed.removeLocks(ctx, 'd', {a: 1})).resolves.toBeUndefined();
      await ed.addLocks(ctx, 'd', {a: 1, b: 2});
      await ed.removeLocks(ctx, 'd', {a: true});
      expect(await ed.getLocks(ctx, 'd')).toEqual({b: 2});
    });

    test('removeAllLocks clears everything', async () => {
      await ed.addLocks(ctx, 'd', {a: 1});
      await ed.removeAllLocks(ctx, 'd');
      expect(await ed.getLocks(ctx, 'd')).toEqual({});
      expect(ed.data[ctx.tenant].d.locks).toBeUndefined();
    });

    test('locks are isolated by tenant and doc', async () => {
      await ed.addLocks(ctx, 'd', {a: 1});
      expect(await ed.getLocks(otherCtx, 'd')).toEqual({});
      expect(await ed.getLocks(ctx, 'd2')).toEqual({});
    });
  });

  describe('messages', () => {
    test('add, get, remove', async () => {
      expect(await ed.getMessages(ctx, 'd')).toEqual([]);
      await ed.addMessage(ctx, 'd', 'm1');
      await ed.addMessage(ctx, 'd', {x: 2});
      expect(await ed.getMessages(ctx, 'd')).toEqual(['m1', {x: 2}]);
      await ed.removeMessages(ctx, 'd');
      expect(await ed.getMessages(ctx, 'd')).toEqual([]);
    });

    test('messages are isolated by tenant', async () => {
      await ed.addMessage(ctx, 'd', 'm1');
      expect(await ed.getMessages(otherCtx, 'd')).toEqual([]);
    });
  });

  describe('saved flag', () => {
    test('getdelSaved returns undefined when never set, then value, then null', async () => {
      expect(await ed.getdelSaved(ctx, 'd')).toBeUndefined();
      await ed.setSaved(ctx, 'd', 'ok');
      expect(await ed.getdelSaved(ctx, 'd')).toBe('ok');
      expect(await ed.getdelSaved(ctx, 'd')).toBeNull();
    });
  });

  describe('force save', () => {
    test('getForceSave is null when unset', async () => {
      expect(await ed.getForceSave(ctx, 'd')).toBeNull();
    });

    test('setForceSave stores a not-started, not-ended record', async () => {
      await ed.setForceSave(ctx, 'd', 100, 1, 'http://base', {c: 1}, {v: 2});
      expect(await ed.getForceSave(ctx, 'd')).toEqual({
        time: 100,
        index: 1,
        baseUrl: 'http://base',
        changeInfo: {c: 1},
        started: false,
        ended: false,
        convertInfo: {v: 2}
      });
    });

    test('checkAndStartForceSave starts once, then returns undefined', async () => {
      expect(await ed.checkAndStartForceSave(ctx, 'd')).toBeUndefined();
      await ed.setForceSave(ctx, 'd', 100, 1, 'u', null, null);
      const first = await ed.checkAndStartForceSave(ctx, 'd');
      expect(first.started).toBe(true);
      expect(first.ended).toBe(false);
      expect(await ed.checkAndStartForceSave(ctx, 'd')).toBeUndefined();
    });

    test('checkAndSetForceSave updates only on matching time and index', async () => {
      expect(await ed.checkAndSetForceSave(ctx, 'd', 100, 1, true, true, 'x')).toBeUndefined();
      await ed.setForceSave(ctx, 'd', 100, 1, 'u', null, null);
      expect(await ed.checkAndSetForceSave(ctx, 'd', 101, 1, true, true, 'x')).toBeUndefined();
      expect(await ed.checkAndSetForceSave(ctx, 'd', 100, 2, true, true, 'x')).toBeUndefined();
      const res = await ed.checkAndSetForceSave(ctx, 'd', 100, 1, true, true, 'x');
      expect(res).toMatchObject({started: true, ended: true, convertInfo: 'x'});
      expect(await ed.checkAndStartForceSave(ctx, 'd')).toBeUndefined();
    });

    test('removeForceSave clears the record', async () => {
      await ed.setForceSave(ctx, 'd', 100, 1, 'u', null, null);
      await ed.removeForceSave(ctx, 'd');
      expect(await ed.getForceSave(ctx, 'd')).toBeNull();
    });
  });

  describe('force save timers', () => {
    test('addForceSaveTimerNX keeps the first expireAt', async () => {
      await ed.addForceSaveTimerNX(ctx, 'd', 100);
      await ed.addForceSaveTimerNX(ctx, 'd', 500);
      expect(await ed.getForceSaveTimer(200)).toEqual([[ctx.tenant, 'd']]);
    });

    test('getForceSaveTimer returns expired entries once (strict <) and removes them', async () => {
      await ed.addForceSaveTimerNX(ctx, 'd1', 100);
      await ed.addForceSaveTimerNX(ctx, 'd2', 300);
      await ed.addForceSaveTimerNX(otherCtx, 'd3', 50);
      expect(await ed.getForceSaveTimer(100)).toEqual([[otherCtx.tenant, 'd3']]);
      expect(await ed.getForceSaveTimer(101)).toEqual([[ctx.tenant, 'd1']]);
      expect(await ed.getForceSaveTimer(101)).toEqual([]);
      expect(await ed.getForceSaveTimer(1000)).toEqual([[ctx.tenant, 'd2']]);
    });
  });

  describe('cleanDocumentOnExit', () => {
    test('removes document data and timer, leaving other docs', async () => {
      await ed.addLocks(ctx, 'd', {a: 1});
      await ed.addMessage(ctx, 'd2', 'm');
      await ed.addForceSaveTimerNX(ctx, 'd', 1);
      await ed.cleanDocumentOnExit(ctx, 'd');
      expect(await ed.getLocks(ctx, 'd')).toEqual({});
      expect(await ed.getMessages(ctx, 'd2')).toEqual(['m']);
      expect(await ed.getForceSaveTimer(1000)).toEqual([]);
    });

    test('tolerates unknown tenant', async () => {
      await expect(ed.cleanDocumentOnExit(otherCtx, 'nope')).resolves.toBeUndefined();
    });
  });
});

describe('EditorStat (in-memory)', () => {
  let es;
  beforeEach(() => {
    es = new EditorStat();
  });

  describe('unique users', () => {
    test.each([
      ['addPresenceUniqueUser', 'getPresenceUniqueUser'],
      ['addPresenceUniqueViewUser', 'getPresenceUniqueViewUser']
    ])('%s / %s returns unexpired users with merged info and prunes expired', async (add, get) => {
      expect(await es[get](ctx, 10)).toEqual([]);
      await es[add](ctx, 'u1', 100, {name: 'A'});
      await es[add](ctx, 'u2', 5, {name: 'B'});
      const res = await es[get](ctx, 10);
      expect(res).toEqual([{userid: 'u1', expire: new Date(100000), name: 'A'}]);
      // u2 was deleted by the previous get, even for an earlier "now"
      expect(await es[get](ctx, 1)).toHaveLength(1);
    });

    test('unique users are isolated by tenant', async () => {
      await es.addPresenceUniqueUser(ctx, 'u1', 100, {});
      expect(await es.getPresenceUniqueUser(otherCtx, 10)).toEqual([]);
    });
  });

  describe('unique users of month', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(1000000);
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test.each([
      ['addPresenceUniqueUsersOfMonth', 'getPresenceUniqueUsersOfMonth'],
      ['addPresenceUniqueViewUsersOfMonth', 'getPresenceUniqueViewUsersOfMonth']
    ])('%s / %s groups by ISO period and expires', async (add, get) => {
      expect(await es[get](ctx)).toEqual({});
      await es[add](ctx, 'u1', 86400000, {n: 1});
      await es[add](ctx, 'u2', 86400000, {n: 2});
      expect(await es[get](ctx)).toEqual({[new Date(86400000).toISOString()]: {u1: {n: 1}, u2: {n: 2}}});
      jest.setSystemTime(1000000 + 365 * 24 * 3600 * 1000 * 10);
      expect(await es[get](ctx)).toEqual({});
    });
  });

  describe('editor connection samples', () => {
    test('set appends samples and get returns them', async () => {
      expect(await es.getEditorConnections(ctx)).toEqual([]);
      await es.setEditorConnections(ctx, 1, 2, 3, 1000, [{val: 10}]);
      await es.setEditorConnections(ctx, 4, 5, 6, 2000, [{val: 10}]);
      expect(await es.getEditorConnections(ctx)).toEqual([
        {time: 1000, edit: 1, liveview: 2, view: 3},
        {time: 2000, edit: 4, liveview: 5, view: 6}
      ]);
    });

    test('old samples are never pruned (object compared with number)', async () => {
      await es.setEditorConnections(ctx, 1, 1, 1, 1, [{val: 10}]);
      await es.setEditorConnections(ctx, 1, 1, 1, 1000000, [{val: 10}]);
      expect(await es.getEditorConnections(ctx)).toHaveLength(2);
    });
  });

  describe('connection counts', () => {
    const conns = [
      {id: 1, user: {view: false}},
      {id: 2, user: {view: true}},
      {id: 3, user: {view: true}, coEditingMode: 'fast'},
      {id: 4, isCloseCoAuthoring: true, user: {view: false}},
      {id: 5}
    ];

    test('getEditorConnectionsCount counts non-view, non-closed connections', async () => {
      expect(await es.getEditorConnectionsCount(ctx, conns)).toBe(2);
      expect(await es.getEditorConnectionsCount(ctx)).toBe(0);
    });

    test('getViewerConnectionsCount counts view users and closed connections', async () => {
      expect(await es.getViewerConnectionsCount(ctx, conns)).toBe(3);
      expect(await es.getViewerConnectionsCount(ctx)).toBe(0);
    });

    test('getLiveViewerConnectionsCount counts view users in fast mode', async () => {
      expect(await es.getLiveViewerConnectionsCount(ctx, conns)).toBe(1);
      expect(await es.getLiveViewerConnectionsCount(ctx)).toBe(0);
    });

    test('shard counters are no-ops', async () => {
      expect(await es.setEditorConnectionsCountByShard(ctx, 's', 1)).toBeUndefined();
      expect(await es.incrEditorConnectionsCountByShard(ctx, 's', 1)).toBeUndefined();
      expect(await es.setViewerConnectionsCountByShard(ctx, 's', 1)).toBeUndefined();
      expect(await es.incrViewerConnectionsCountByShard(ctx, 's', 1)).toBeUndefined();
      expect(await es.setLiveViewerConnectionsCountByShard(ctx, 's', 1)).toBeUndefined();
      expect(await es.incrLiveViewerConnectionsCountByShard(ctx, 's', 1)).toBeUndefined();
      expect(await es.deleteKey('k')).toBeUndefined();
    });
  });

  describe('shutdown', () => {
    test('add/remove/count/cleanup', async () => {
      expect(await es.getShutdownCount('k')).toBe(0);
      await es.addShutdown('k', 'd1');
      await es.addShutdown('k', 'd1');
      await es.addShutdown('k', 'd2');
      expect(await es.getShutdownCount('k')).toBe(2);
      await es.removeShutdown('k', 'd1');
      expect(await es.getShutdownCount('k')).toBe(1);
      await es.removeShutdown('unknown', 'd1');
      expect(await es.getShutdownCount('unknown')).toBe(0);
      await es.cleanupShutdown('k');
      expect(await es.getShutdownCount('k')).toBe(0);
    });
  });

  describe('license', () => {
    test('set, get, remove', async () => {
      expect(await es.getLicense('k')).toBeNull();
      await es.setLicense('k', {a: 1});
      expect(await es.getLicense('k')).toEqual({a: 1});
      await es.removeLicense('k');
      expect(await es.getLicense('k')).toBeNull();
    });
  });

  describe('lockNotification', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(1000000);
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test('is not re-entrant (NaN token) and expires after ttl', async () => {
      expect(await es.lockNotification(ctx, 'n', 10)).toBe(true);
      expect(await es.lockNotification(ctx, 'n', 10)).toBe(false);
      expect(await es.lockNotification(ctx, 'other', 10)).toBe(true);
      jest.setSystemTime(1000000 + 10000);
      expect(await es.lockNotification(ctx, 'n', 10)).toBe(true);
    });
  });
});
