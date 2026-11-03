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

// Characterization of DocsCoServer crash-prone paths (PKT-0028, plan P2).
// Pins CURRENT behaviour, including ugly behaviour, so that P4 can add guards and see exactly
// which expectations flip. Expectations tagged "crash-prone: P4 target" are the ones a guard is
// expected to change. Uses the real editorDataMemory store (the default editorDataStorage) and a
// fake socket.io server/connection; RabbitMQ pubsub/queue, the database (taskresult, baseConnector),
// storage and canvasservice are mocked. No network, no database.

const {describe, test, expect, jest, beforeAll, beforeEach} = require('@jest/globals');
const {EventEmitter} = require('events');
const util = require('util');
const {PassThrough, Readable, Writable} = require('stream');

// --- fake socket.io: install() registers its handlers here ---
const fakeIo = {useHandler: null, connectionHandler: null};
jest.mock('./../../DocService/node_modules/socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    use: fn => {
      fakeIo.useHandler = fn;
    },
    on: (event, fn) => {
      if ('connection' === event) {
        fakeIo.connectionHandler = fn;
      }
    },
    engine: {on: () => {}}
  }))
}));
// RabbitMQ: init calls back so `pubsub` and `queue` are assigned; publish loops back like a broker.
jest.mock('./../../DocService/sources/pubsubRabbitMQ', () => {
  const {EventEmitter} = require('events');
  return class FakePubSub extends EventEmitter {
    init(cb) {
      cb(null);
    }
    publish(msg) {
      setImmediate(() => this.emit('message', msg));
      return Promise.resolve();
    }
  };
});
const fakeQueueCalls = {addTask: [], addDelayed: []};
jest.mock('./../../Common/sources/taskqueueRabbitMQ', () => {
  const {EventEmitter} = require('events');
  return class FakeQueue extends EventEmitter {
    init(...args) {
      args[args.length - 1](null);
    }
    addTask(...args) {
      fakeQueueCalls.addTask.push(args);
      return Promise.resolve();
    }
    addResponse() {
      return Promise.resolve();
    }
    addDelayed(...args) {
      fakeQueueCalls.addDelayed.push(args);
      return Promise.resolve();
    }
    removeResponse() {
      return Promise.resolve();
    }
  };
});
jest.mock('./../../DocService/sources/gc', () => ({...jest.requireActual('./../../DocService/sources/gc'), startGC: jest.fn()}));
jest.mock('./../../DocService/sources/databaseConnectors/baseConnector', () => {
  const actual = jest.requireActual('./../../DocService/sources/databaseConnectors/baseConnector');
  return {
    ...actual,
    // schema check fails => editorData.connect()/callbackFunction are never reached
    getTableColumns: jest.fn(() => Promise.reject(new Error('no database in unit tests'))),
    getChangesIndexPromise: jest.fn(),
    getChangesPromise: jest.fn(),
    deleteChanges: jest.fn(),
    deleteChangesPromise: jest.fn(),
    insertChangesPromise: jest.fn()
  };
});
jest.mock('./../../DocService/sources/taskresult', () => {
  const actual = jest.requireActual('./../../DocService/sources/taskresult');
  return {...actual, select: jest.fn(), selectWithCache: jest.fn(), update: jest.fn(), updateIf: jest.fn(), upsert: jest.fn()};
});
jest.mock('./../../DocService/sources/canvasservice', () => ({
  hasAdditionalCol: false,
  receiveTask: jest.fn(),
  commandOpenStartPromise: jest.fn(),
  openDocument: jest.fn(),
  getOpenedAt: jest.fn(),
  saveFromChanges: jest.fn(),
  commandSfcCallback: jest.fn()
}));
jest.mock('./../../Common/sources/storage/storage-base', () => ({
  listObjects: jest.fn(),
  deletePath: jest.fn(),
  getSignedUrl: jest.fn(),
  createReadStream: jest.fn(),
  headObject: jest.fn()
}));

const taskResult = require('./../../DocService/sources/taskresult');
const sqlBase = require('./../../DocService/sources/databaseConnectors/baseConnector');
const canvasService = require('./../../DocService/sources/canvasservice');
const storage = require('./../../Common/sources/storage/storage-base');
const constants = require('./../../Common/sources/constants');
const commonDefines = require('./../../Common/sources/commondefines');
const operationContext = require('./../../Common/sources/operationContext');
const utils = require('./../../Common/sources/utils');
const license = require('./../../Common/sources/license');
const docsCoServer = require('./../../DocService/sources/DocsCoServer');
const Log4jsLogger = require('./../../Common/node_modules/log4js/lib/logger');

// --- helpers ---
let seq = 0;
function uniqueDocId() {
  seq++;
  return `crashdoc${seq}`;
}
function createConn(docId, opt_noHandshake) {
  const conn = new EventEmitter();
  conn.id = `conn-${docId}-${Math.random().toString(36).slice(2)}`;
  if (!opt_noHandshake) {
    conn.handshake = {query: {}, headers: {host: 'localhost'}, url: `/doc/${docId}/c/?EIO=4&transport=websocket`};
  }
  conn.request = {headers: {host: 'localhost'}};
  conn.conn = {readyState: 'open'};
  conn.sent = [];
  // server -> client messages are recorded, not dispatched to our listeners
  conn.emit = function (event, payload) {
    if ('message' === event) {
      this.sent.push(payload);
      return true;
    }
    return EventEmitter.prototype.emit.apply(this, arguments);
  };
  conn.disconnect = jest.fn(() => {
    conn.conn.readyState = constants.CONN_CLOSED;
  });
  return conn;
}
async function flush(n = 5) {
  for (let i = 0; i < n; ++i) {
    await new Promise(resolve => setImmediate(resolve));
  }
}
// client -> server: call the listeners registered by DocsCoServer and wait for their co() promises
async function fire(conn, event, payload) {
  await Promise.all(conn.listeners(event).map(fn => fn(payload)));
  await flush();
}
async function connect(docId, opt_noHandshake) {
  const conn = createConn(docId, opt_noHandshake);
  await fakeIo.connectionHandler(conn);
  await flush();
  return conn;
}
function authMessage(docId, user, extra) {
  return {type: 'auth', token: 'legacy', docid: docId, user, lang: 'en', editorType: 0, ...extra};
}
// io.use calls next() only after async work (initTenantCache, checkJwt) whose duration is not bounded
// by a fixed number of event-loop ticks: wait for next() itself instead of flushing (PKT-0079).
function runUseHandler(socket, next) {
  return new Promise(resolve => {
    fakeIo.useHandler(socket, (...args) => {
      next(...args);
      resolve();
    });
  });
}
function sentOfType(conn, type) {
  return conn.sent.filter(m => m && m.type === type);
}
function findConnection(conn) {
  return docsCoServer.getConnections().find(c => c === conn);
}
// log4js binds console.log at load, so capture at the Logger level (error/warn only, output silenced)
let logLines = [];
function logged(re) {
  return logLines.some(line => re.test(line));
}
for (const level of ['error', 'warn']) {
  jest.spyOn(Log4jsLogger.prototype, level).mockImplementation((...args) => {
    logLines.push(util.format(...args));
  });
}

beforeAll(async () => {
  // as server.js does at startup: without a default license getTenantLicense returns undefined
  const [licenseInfo, licenseOriginal] = await license.readLicense();
  await docsCoServer.setLicenseInfo(operationContext.global, licenseInfo, licenseOriginal);
  docsCoServer.install({}, {}, () => {});
});

beforeEach(() => {
  logLines = [];
  fakeQueueCalls.addTask.length = 0;
  fakeQueueCalls.addDelayed.length = 0;
  taskResult.select.mockResolvedValue([]);
  taskResult.selectWithCache.mockResolvedValue([]);
  taskResult.update.mockResolvedValue({affectedRows: 1});
  taskResult.updateIf.mockResolvedValue({affectedRows: 1});
  sqlBase.getChangesIndexPromise.mockResolvedValue([]);
  sqlBase.getChangesPromise.mockResolvedValue([]);
  canvasService.commandOpenStartPromise.mockResolvedValue({isInsert: false, insertId: 1});
  canvasService.openDocument.mockResolvedValue(undefined);
  canvasService.saveFromChanges.mockResolvedValue(undefined);
  storage.listObjects.mockResolvedValue([]);
  storage.deletePath.mockResolvedValue(undefined);
});

describe('harness', () => {
  test('install registers the socket.io handlers', () => {
    expect(typeof fakeIo.useHandler).toBe('function');
    expect(typeof fakeIo.connectionHandler).toBe('function');
  });
});

describe('io.use handshake auth', () => {
  test('no token and token.enable.browser=false (default): next() without error', async () => {
    const socket = createConn(uniqueDocId());
    socket.handshake.auth = {};
    const next = jest.fn();
    await runUseHandler(socket, next);
    expect(next).toHaveBeenCalledWith(undefined);
  });
  test('invalid token: next(Error("not authorized")) with code/description', async () => {
    const socket = createConn(uniqueDocId());
    socket.handshake.auth = {token: 'not-a-jwt'};
    const next = jest.fn();
    await runUseHandler(socket, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('not authorized');
    expect(err.data).toEqual(expect.objectContaining({code: expect.any(Number)}));
  });
});

describe('connection without tenant/handshake data', () => {
  test('conn without handshake: guarded, DROP reason sent and disconnected with a clear log', async () => {
    // crash-prone: P4 target, guarded by PKT-0070 (was: TypeError from initFromConnection)
    const conn = await connect(uniqueDocId(), true);
    expect(sentOfType(conn, 'disconnectReason')).toEqual([expect.objectContaining({code: constants.DROP_CODE})]);
    expect(conn.disconnect).toHaveBeenCalledWith(true);
    expect(logged(/connection without handshake data/)).toBe(true);
    expect(logged(/TypeError/)).toBe(false);
  });
  test('normal conn gets a license message and stays open', async () => {
    const conn = await connect(uniqueDocId());
    expect(sentOfType(conn, 'license')).toHaveLength(1);
    expect(conn.disconnect).not.toHaveBeenCalled();
  });
});

describe('auth with missing user name / permissions / user', () => {
  test('auth without data.user: ACCESS_DENIED and disconnect, no auth reply', async () => {
    // crash-prone: P4 target, guarded by PKT-0070 (was: dangling unauthenticated connection)
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', {type: 'auth', token: 'legacy', docid: docId});
    expect(sentOfType(conn, 'auth')).toHaveLength(0);
    expect(sentOfType(conn, 'disconnectReason')).toEqual([expect.objectContaining({code: constants.ACCESS_DENIED_CODE})]);
    expect(conn.disconnect).toHaveBeenCalledWith(true);
    expect(logged(/auth rejected: missing user/)).toBe(true);
    expect(conn.user).toBeUndefined();
    expect(findConnection(conn)).toBeUndefined();
  });
  test('auth without data.token: silently ignored as well', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', {type: 'auth', docid: docId, user: {id: 'u1', username: 'U'}});
    expect(sentOfType(conn, 'auth')).toHaveLength(0);
    expect(conn.user).toBeUndefined();
  });
  test('user without any name: username "Anonymous"', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1'}));
    expect(sentOfType(conn, 'auth')).toEqual([expect.objectContaining({result: 1})]);
    expect(conn.user.username).toBe('Anonymous');
    expect(findConnection(conn)).toBe(conn);
    await fire(conn, 'disconnect', 'transport close');
  });
  test('user with firstname only: username "Anonymous" (lastname required for the pair)', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', firstname: 'Ana'}));
    expect(conn.user.username).toBe('Anonymous');
    await fire(conn, 'disconnect', 'transport close');
  });
  test('user without id: a unique "uid-" id is generated (as web-apps does)', async () => {
    // crash-prone: P4 target, guarded by PKT-0070 (was: idOriginal the string "undefined")
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {username: 'NoId'}));
    expect(conn.user.idOriginal).toMatch(/^uid-\d+-[0-9a-f]{8}$/);
    expect(conn.user.id).toBe(conn.user.idOriginal + '1');
    expect(logged(/auth: user without id, generated id/)).toBe(true);
    expect(sentOfType(conn, 'auth')).toHaveLength(1);
    await fire(conn, 'disconnect', 'transport close');
  });
  test('missing permissions and mode: editor (view=false)', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    expect(conn.permissions).toBeUndefined();
    expect(conn.user.view).toBe(false);
    await fire(conn, 'disconnect', 'transport close');
  });
  test('permissions.edit=false: viewer', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}, {permissions: {edit: false}}));
    expect(conn.user.view).toBe(true);
    await fire(conn, 'disconnect', 'transport close');
  });
  test('auth throwing (database error): ACCESS_DENIED and disconnect', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    taskResult.select.mockRejectedValueOnce(new Error('db down'));
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    expect(sentOfType(conn, 'disconnectReason')).toEqual([expect.objectContaining({code: constants.ACCESS_DENIED_CODE})]);
    expect(conn.disconnect).toHaveBeenCalledWith(true);
  });
});

describe('messages before auth (conn.user undefined)', () => {
  test('unLockDocument: guarded, ignored with a warning, no reply, no disconnect', async () => {
    // crash-prone: P4 target, guarded by PKT-0070 (was: TypeError on conn.user.id)
    const conn = await connect(uniqueDocId());
    await fire(conn, 'message', {type: 'unLockDocument', unlock: true, isSave: false});
    expect(logged(/unLockDocument ignored: connection is not authenticated/)).toBe(true);
    expect(logged(/error receiving response/)).toBe(false);
    expect(conn.sent.filter(m => m && m.type !== 'license')).toHaveLength(0);
    expect(conn.disconnect).not.toHaveBeenCalled();
  });
  test('saveChanges: guarded, ignored with a warning', async () => {
    // crash-prone: P4 target, guarded by PKT-0070 (was: TypeError on conn.user.id in saveChanges)
    const conn = await connect(uniqueDocId());
    await fire(conn, 'message', {type: 'saveChanges', changes: '[]'});
    expect(logged(/saveChanges ignored: connection is not authenticated/)).toBe(true);
    expect(logged(/error receiving response/)).toBe(false);
    expect(sqlBase.insertChangesPromise).not.toHaveBeenCalled();
    expect(conn.disconnect).not.toHaveBeenCalled();
  });
  test('forceSaveStart: guarded, replies UnknownError', async () => {
    const conn = await connect(uniqueDocId());
    await fire(conn, 'message', {type: 'forceSaveStart'});
    expect(sentOfType(conn, 'forceSaveStart')).toEqual([
      {type: 'forceSaveStart', messages: {code: commonDefines.c_oAscServerCommandErrors.UnknownError, time: null}}
    ]);
  });
  test('close and disconnect: closeDocument returns early (docId null)', async () => {
    const conn = await connect(uniqueDocId());
    await fire(conn, 'message', {type: 'close'});
    await fire(conn, 'disconnect', 'transport close');
    expect(logged(/Error conn close/)).toBe(false);
    expect(logged(/error receiving response/)).toBe(false);
  });
});

describe('client disconnect during auth / save', () => {
  test('disconnect while commandOpenStartPromise is pending: auth stops at CONN_CLOSED, conn not registered', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    let resolveOpen;
    canvasService.commandOpenStartPromise.mockReturnValueOnce(
      new Promise(resolve => {
        resolveOpen = resolve;
      })
    );
    const authDone = fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    await flush();
    conn.conn.readyState = constants.CONN_CLOSED;
    await fire(conn, 'disconnect', 'transport close');
    resolveOpen({isInsert: false, insertId: 1});
    await authDone;
    expect(conn.user).toBeUndefined();
    expect(sentOfType(conn, 'auth')).toHaveLength(0);
    expect(findConnection(conn)).toBeUndefined();
    expect(logged(/Error conn close/)).toBe(false);
  });
  test('disconnect while saveChanges waits for the changes index: save stops, nothing inserted', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    let resolveIndex;
    sqlBase.getChangesIndexPromise.mockReturnValueOnce(
      new Promise(resolve => {
        resolveIndex = resolve;
      })
    );
    const saveDone = fire(conn, 'message', {type: 'saveChanges', changes: '["c1"]', startSaveChanges: true, endSaveChanges: true});
    await flush();
    conn.conn.readyState = constants.CONN_CLOSED;
    resolveIndex([]);
    await saveDone;
    expect(sqlBase.insertChangesPromise).not.toHaveBeenCalled();
    expect(sentOfType(conn, 'savePartChanges')).toHaveLength(0);
    expect(logged(/error receiving response/)).toBe(false);
    await fire(conn, 'disconnect', 'transport close');
  });
  test('last editor disconnects with changes: SaveVersion set, save started after savetimeoutdelay', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    sqlBase.getChangesIndexPromise.mockResolvedValue([{change_id: 2}]);
    const sleepSpy = jest.spyOn(utils, 'sleep').mockResolvedValue(undefined);
    let sleepCalls;
    try {
      await fire(conn, 'disconnect', 'transport close');
    } finally {
      sleepCalls = sleepSpy.mock.calls.slice();
      sleepSpy.mockRestore();
    }
    expect(findConnection(conn)).toBeUndefined();
    expect(taskResult.updateIf).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({status: commonDefines.FileStatus.SaveVersion}),
      expect.objectContaining({key: docId, status: commonDefines.FileStatus.Ok})
    );
    // a disconnect (reason set) waits savetimeoutdelay (default 5000 ms) in case the user reconnects
    expect(sleepCalls).toEqual([[5000]]);
    expect(canvasService.saveFromChanges).toHaveBeenCalledTimes(1);
  });
  test('"close" by the last editor with changes: save starts without delay; later disconnect is a no-op', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    sqlBase.getChangesIndexPromise.mockResolvedValue([{change_id: 2}]);
    await fire(conn, 'message', {type: 'close'});
    expect(conn.isCloseCoAuthoring).toBe(true);
    expect(conn.user.view).toBe(true);
    expect(sentOfType(conn, 'refreshToken')).toHaveLength(1);
    expect(canvasService.saveFromChanges).toHaveBeenCalledTimes(1);
    expect(canvasService.saveFromChanges.mock.calls[0][1]).toBe(docId);
    await fire(conn, 'disconnect', 'transport close');
    expect(canvasService.saveFromChanges).toHaveBeenCalledTimes(1);
    expect(logged(/Error conn close/)).toBe(false);
  });
  test('last editor disconnects without changes: document cleaned, no save', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    await fire(conn, 'disconnect', 'transport close');
    expect(canvasService.saveFromChanges).not.toHaveBeenCalled();
    expect(taskResult.updateIf).not.toHaveBeenCalled();
    expect(logged(/Error conn close/)).toBe(false);
  });
});

describe('forcesave after close', () => {
  test('forceSaveStart after "close" (no forcesave data): NotModified', async () => {
    const docId = uniqueDocId();
    const conn = await connect(docId);
    await fire(conn, 'message', authMessage(docId, {id: 'u1', username: 'U'}));
    await fire(conn, 'message', {type: 'close'});
    taskResult.select.mockResolvedValue([{key: docId, status: commonDefines.FileStatus.Ok}]);
    await fire(conn, 'message', {type: 'forceSaveStart'});
    const replies = sentOfType(conn, 'forceSaveStart');
    expect(replies).toHaveLength(1);
    expect(replies[0].messages.code).toBe(commonDefines.c_oAscServerCommandErrors.NotModified);
    await fire(conn, 'disconnect', 'transport close');
  });
  test('startForceSave(Form) with a connection that has no user: guarded, resolves without TypeError', async () => {
    // crash-prone: P4 target, guarded by PKT-0070 (was: rejected TypeError in getExternalChangeInfo)
    const docId = uniqueDocId();
    const conn = createConn(docId);
    const ctx = new operationContext.Context();
    ctx.initFromConnection(conn);
    await expect(
      docsCoServer.startForceSave(
        ctx,
        docId,
        commonDefines.c_oAscForceSaveTypes.Form,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        conn
      )
    ).resolves.toEqual({code: commonDefines.c_oAscServerCommandErrors.UnknownError, time: null, inProgress: false});
    expect(logged(/startForceSave ignored: connection is not authenticated/)).toBe(true);
  });
  test('startForceSave(Command) after every user left (no presence, no forcesave data): NotModified/DocumentIdError', async () => {
    const docId = uniqueDocId();
    const ctx = new operationContext.Context();
    ctx.initFromConnection(createConn(docId));
    const res = await docsCoServer.startForceSave(ctx, docId, commonDefines.c_oAscForceSaveTypes.Command);
    expect(res).toEqual({code: commonDefines.c_oAscServerCommandErrors.DocumentIdError, time: null, inProgress: false});
    taskResult.select.mockResolvedValueOnce([{key: docId}]);
    const res2 = await docsCoServer.startForceSave(ctx, docId, commonDefines.c_oAscForceSaveTypes.Command);
    expect(res2.code).toBe(commonDefines.c_oAscServerCommandErrors.NotModified);
  });
});

describe('file streaming: utils.pipeHttpStreams on client disconnect', () => {
  test('destination destroyed mid-stream (client gone): resolves, no throw', async () => {
    const from = new PassThrough();
    const to = new Writable({
      write(chunk, enc, cb) {
        cb();
      }
    });
    const piping = utils.pipeHttpStreams(from, to);
    from.write('part');
    to.destroy();
    await expect(piping).resolves.toBeUndefined();
  });
  test('destination fails with ECONNRESET: resolves', async () => {
    const from = new PassThrough();
    const to = new Writable({
      write(chunk, enc, cb) {
        const err = new Error('reset');
        err.code = 'ECONNRESET';
        cb(err);
      }
    });
    const piping = utils.pipeHttpStreams(from, to);
    from.end('data');
    await expect(piping).resolves.toBeUndefined();
  });
  test('source (storage) error: rejects', async () => {
    const from = new Readable({
      read() {
        this.destroy(new Error('storage failure'));
      }
    });
    const to = new Writable({
      write(chunk, enc, cb) {
        cb();
      }
    });
    await expect(utils.pipeHttpStreams(from, to)).rejects.toThrow('storage failure');
  });
});
