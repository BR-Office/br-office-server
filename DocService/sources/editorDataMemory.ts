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
// `node ts-strip.js` erases the types and writes editorDataMemory.js next to this file.
// CommonJS stays as it was (require / module.exports) so the exports shape is unchanged.

type EditorContext = import('./editorData.types').EditorContext;
type EditorConnection = import('./editorData.types').EditorConnection;
type UnlockResult = import('./editorData.types').UnlockResult;
type LockMap = import('./editorData.types').LockMap;
type AddLocksNXResult = import('./editorData.types').AddLocksNXResult;
type ForceSaveState = import('./editorData.types').ForceSaveState;
type UniqueUserRecord = import('./editorData.types').UniqueUserRecord;
type EditorConnectionsSample = import('./editorData.types').EditorConnectionsSample;
type PrecisionEntry = import('./editorData.types').PrecisionEntry;
type EditorDataContract = import('./editorData.types').EditorDataContract;
type EditorStatContract = import('./editorData.types').EditorStatContract;

interface LockEntry {
  fencingToken: unknown;
  expireAt: number;
}

/** Per-document state; lock names (lockSave, lockAuth, notification types) are dynamic keys. */
interface DocumentData {
  locks?: LockMap;
  messages?: unknown[];
  saved?: unknown;
  forceSave?: ForceSaveState;
  [lockName: string]: unknown;
}

interface PresenceEntry {
  expireAt: number;
  userInfo: unknown;
}

interface MonthPeriod {
  expireAt: number;
  data: Record<string, unknown>;
}

// Untyped packages and not-yet-migrated JS modules: local signatures for the part used here.
const config: {get<T>(setting: string): T} = require('config');
const ms: (value: string) => number = require('ms');
const utils: {
  getConnectionInfoStr(conn: EditorConnection): string;
  isLiveViewer(conn: EditorConnection): boolean;
} = require('./../../Common/sources/utils');
const commonDefines: {
  c_oAscUnlockRes: {Locked: UnlockResult; Unlocked: UnlockResult; Empty: UnlockResult};
} = require('./../../Common/sources/commondefines');
const tenantManager: {
  getTenantByConnection(ctx: EditorContext, conn: EditorConnection): string;
} = require('./../../Common/sources/tenantManager');

const cfgExpMonthUniqueUsers = ms(config.get<string>('services.CoAuthoring.expire.monthUniqueUsers'));

class EditorCommon {
  data: Record<string, Record<string, DocumentData>>;

  constructor() {
    this.data = {};
  }
  async connect(): Promise<void> {}
  isConnected(): boolean {
    return true;
  }
  async ping(): Promise<string> {
    return 'PONG';
  }
  async close(): Promise<void> {}
  async healthCheck(): Promise<boolean> {
    if (this.isConnected()) {
      await this.ping();
      return true;
    }
    return false;
  }
  _getDocumentData(ctx: EditorContext, docId: string): DocumentData {
    let tenantData = this.data[ctx.tenant];
    if (!tenantData) {
      this.data[ctx.tenant] = tenantData = {};
    }
    let options = tenantData[docId];
    if (!options) {
      tenantData[docId] = options = {};
    }
    return options;
  }
  _checkAndLock(ctx: EditorContext, name: string, docId: string, fencingToken: unknown, ttl: number): boolean {
    const data = this._getDocumentData(ctx, docId);
    const now = Date.now();
    let res = true;
    const lock = data[name] as LockEntry | undefined;
    if (lock && now < lock.expireAt && fencingToken !== lock.fencingToken) {
      res = false;
    } else {
      const expireAt = now + ttl * 1000;
      data[name] = {fencingToken, expireAt};
    }
    return res;
  }
  _checkAndUnlock(ctx: EditorContext, name: string, docId: string, fencingToken: unknown): UnlockResult {
    const data = this._getDocumentData(ctx, docId);
    const now = Date.now();
    let res: UnlockResult;
    const lock = data[name] as LockEntry | undefined;
    if (lock && now < lock.expireAt) {
      if (fencingToken === lock.fencingToken) {
        res = commonDefines.c_oAscUnlockRes.Unlocked;
        delete data[name];
      } else {
        res = commonDefines.c_oAscUnlockRes.Locked;
      }
    } else {
      res = commonDefines.c_oAscUnlockRes.Empty;
      delete data[name];
    }
    return res;
  }
}

class EditorData extends EditorCommon implements EditorDataContract {
  forceSaveTimer: Record<string, Record<string, number>>;

  constructor() {
    super();
    this.forceSaveTimer = {};
  }

  async addPresence(_ctx: EditorContext, _docId: string, _userId: string, _userInfo: unknown): Promise<void> {}
  async updatePresence(_ctx: EditorContext, _docId: string, _userId: string): Promise<void> {}
  async removePresence(_ctx: EditorContext, _docId: string, _userId: string): Promise<void> {}
  async getPresence(ctx: EditorContext, docId: string, connections?: EditorConnection[] | null): Promise<string[]> {
    const hvals: string[] = [];
    if (connections) {
      for (let i = 0; i < connections.length; ++i) {
        const conn = connections[i];
        if (conn.docId === docId && ctx.tenant === tenantManager.getTenantByConnection(ctx, conn)) {
          hvals.push(utils.getConnectionInfoStr(conn));
        }
      }
    }
    return hvals;
  }

  async lockSave(ctx: EditorContext, docId: string, userId: unknown, ttl: number): Promise<boolean> {
    return this._checkAndLock(ctx, 'lockSave', docId, userId, ttl);
  }
  async unlockSave(ctx: EditorContext, docId: string, userId: unknown): Promise<UnlockResult> {
    return this._checkAndUnlock(ctx, 'lockSave', docId, userId);
  }
  async lockAuth(ctx: EditorContext, docId: string, userId: unknown, ttl: number): Promise<boolean> {
    return this._checkAndLock(ctx, 'lockAuth', docId, userId, ttl);
  }
  async unlockAuth(ctx: EditorContext, docId: string, userId: unknown): Promise<UnlockResult> {
    return this._checkAndUnlock(ctx, 'lockAuth', docId, userId);
  }

  async getDocumentPresenceExpired(_now: number): Promise<unknown[]> {
    return [];
  }
  async removePresenceDocument(_ctx: EditorContext, _docId: string): Promise<void> {}

  async addLocks(ctx: EditorContext, docId: string, locks: LockMap): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    if (!data.locks) {
      data.locks = {};
    }
    Object.assign(data.locks, locks);
  }
  async addLocksNX(ctx: EditorContext, docId: string, locks: LockMap): Promise<AddLocksNXResult> {
    const data = this._getDocumentData(ctx, docId);
    if (!data.locks) {
      data.locks = {};
    }
    const lockConflict: LockMap = {};
    for (const lockId in locks) {
      if (undefined === data.locks[lockId]) {
        data.locks[lockId] = locks[lockId];
      } else {
        lockConflict[lockId] = locks[lockId];
      }
    }
    return {lockConflict, allLocks: data.locks};
  }
  async removeLocks(ctx: EditorContext, docId: string, locks: LockMap): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    if (data.locks) {
      for (const lockId in locks) {
        delete data.locks[lockId];
      }
    }
  }
  async removeAllLocks(ctx: EditorContext, docId: string): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    data.locks = undefined;
  }
  async getLocks(ctx: EditorContext, docId: string): Promise<LockMap> {
    const data = this._getDocumentData(ctx, docId);
    return data.locks || {};
  }

  async addMessage(ctx: EditorContext, docId: string, msg: unknown): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    if (!data.messages) {
      data.messages = [];
    }
    data.messages.push(msg);
  }
  async removeMessages(ctx: EditorContext, docId: string): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    data.messages = undefined;
  }
  async getMessages(ctx: EditorContext, docId: string): Promise<unknown[]> {
    const data = this._getDocumentData(ctx, docId);
    return data.messages || [];
  }

  async setSaved(ctx: EditorContext, docId: string, status: unknown): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    data.saved = status;
  }
  async getdelSaved(ctx: EditorContext, docId: string): Promise<unknown> {
    const data = this._getDocumentData(ctx, docId);
    const res = data.saved;
    data.saved = null;
    return res;
  }
  async setForceSave(
    ctx: EditorContext,
    docId: string,
    time: unknown,
    index: unknown,
    baseUrl: unknown,
    changeInfo: unknown,
    convertInfo: unknown
  ): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    data.forceSave = {time, index, baseUrl, changeInfo, started: false, ended: false, convertInfo};
  }
  async getForceSave(ctx: EditorContext, docId: string): Promise<ForceSaveState | null> {
    const data = this._getDocumentData(ctx, docId);
    return data.forceSave || null;
  }
  async checkAndStartForceSave(ctx: EditorContext, docId: string): Promise<ForceSaveState | undefined> {
    const data = this._getDocumentData(ctx, docId);
    let res: ForceSaveState | undefined;
    if (data.forceSave && !data.forceSave.started) {
      data.forceSave.started = true;
      data.forceSave.ended = false;
      res = data.forceSave;
    }
    return res;
  }
  async checkAndSetForceSave(
    ctx: EditorContext,
    docId: string,
    time: unknown,
    index: unknown,
    started: unknown,
    ended: unknown,
    convertInfo: unknown
  ): Promise<ForceSaveState | undefined> {
    const data = this._getDocumentData(ctx, docId);
    let res: ForceSaveState | undefined;
    if (data.forceSave && time === data.forceSave.time && index === data.forceSave.index) {
      data.forceSave.started = started;
      data.forceSave.ended = ended;
      data.forceSave.convertInfo = convertInfo;
      res = data.forceSave;
    }
    return res;
  }
  async removeForceSave(ctx: EditorContext, docId: string): Promise<void> {
    const data = this._getDocumentData(ctx, docId);
    data.forceSave = undefined;
  }

  async cleanDocumentOnExit(ctx: EditorContext, docId: string): Promise<void> {
    const tenantData = this.data[ctx.tenant];
    if (tenantData) {
      delete tenantData[docId];
    }
    const tenantTimer = this.forceSaveTimer[ctx.tenant];
    if (tenantTimer) {
      delete tenantTimer[docId];
    }
  }

  async addForceSaveTimerNX(ctx: EditorContext, docId: string, expireAt: number): Promise<void> {
    let tenantTimer = this.forceSaveTimer[ctx.tenant];
    if (!tenantTimer) {
      this.forceSaveTimer[ctx.tenant] = tenantTimer = {};
    }
    if (!tenantTimer[docId]) {
      tenantTimer[docId] = expireAt;
    }
  }
  async getForceSaveTimer(now: number): Promise<Array<[string, string]>> {
    const res: Array<[string, string]> = [];
    for (const tenant in this.forceSaveTimer) {
      if (Object.hasOwn(this.forceSaveTimer, tenant)) {
        const tenantTimer = this.forceSaveTimer[tenant];
        for (const docId in tenantTimer) {
          if (Object.hasOwn(tenantTimer, docId)) {
            if (tenantTimer[docId] < now) {
              res.push([tenant, docId]);
              delete tenantTimer[docId];
            }
          }
        }
      }
    }
    return res;
  }
}

class EditorStat extends EditorCommon implements EditorStatContract {
  uniqueUser: Record<string, Record<string, PresenceEntry>>;
  uniqueUsersOfMonth: Record<string, Record<string, MonthPeriod>>;
  uniqueViewUser: Record<string, Record<string, PresenceEntry>>;
  uniqueViewUsersOfMonth: Record<string, Record<string, MonthPeriod>>;
  stat: Record<string, EditorConnectionsSample[]>;
  shutdown: Record<string, Record<string, number>>;
  license: Record<string, unknown>;

  constructor() {
    super();
    this.uniqueUser = {};
    this.uniqueUsersOfMonth = {};
    this.uniqueViewUser = {};
    this.uniqueViewUsersOfMonth = {};
    this.stat = {};
    this.shutdown = {};
    this.license = {};
  }
  async addPresenceUniqueUser(ctx: EditorContext, userId: string, expireAt: number, userInfo: unknown): Promise<void> {
    let tenantUser = this.uniqueUser[ctx.tenant];
    if (!tenantUser) {
      this.uniqueUser[ctx.tenant] = tenantUser = {};
    }
    tenantUser[userId] = {expireAt, userInfo};
  }
  async getPresenceUniqueUser(ctx: EditorContext, nowUTC: number): Promise<UniqueUserRecord[]> {
    const res: UniqueUserRecord[] = [];
    let tenantUser = this.uniqueUser[ctx.tenant];
    if (!tenantUser) {
      this.uniqueUser[ctx.tenant] = tenantUser = {};
    }
    for (const userId in tenantUser) {
      if (Object.hasOwn(tenantUser, userId)) {
        if (tenantUser[userId].expireAt > nowUTC) {
          const elem = tenantUser[userId];
          const newElem: UniqueUserRecord = {userid: userId, expire: new Date(elem.expireAt * 1000)};
          Object.assign(newElem, elem.userInfo);
          res.push(newElem);
        } else {
          delete tenantUser[userId];
        }
      }
    }
    return res;
  }
  async addPresenceUniqueUsersOfMonth(ctx: EditorContext, userId: string, period: string | number, userInfo: unknown): Promise<void> {
    let tenantUser = this.uniqueUsersOfMonth[ctx.tenant];
    if (!tenantUser) {
      this.uniqueUsersOfMonth[ctx.tenant] = tenantUser = {};
    }
    if (!tenantUser[period]) {
      const expireAt = Date.now() + cfgExpMonthUniqueUsers;
      tenantUser[period] = {expireAt, data: {}};
    }
    tenantUser[period].data[userId] = userInfo;
  }
  async getPresenceUniqueUsersOfMonth(ctx: EditorContext): Promise<Record<string, Record<string, unknown>>> {
    const res: Record<string, Record<string, unknown>> = {};
    const nowUTC = Date.now();
    let tenantUser = this.uniqueUsersOfMonth[ctx.tenant];
    if (!tenantUser) {
      this.uniqueUsersOfMonth[ctx.tenant] = tenantUser = {};
    }
    for (const periodId in tenantUser) {
      if (Object.hasOwn(tenantUser, periodId)) {
        if (tenantUser[periodId].expireAt <= nowUTC) {
          delete tenantUser[periodId];
        } else {
          const date = new Date(parseInt(periodId)).toISOString();
          res[date] = tenantUser[periodId].data;
        }
      }
    }
    return res;
  }

  async addPresenceUniqueViewUser(ctx: EditorContext, userId: string, expireAt: number, userInfo: unknown): Promise<void> {
    let tenantUser = this.uniqueViewUser[ctx.tenant];
    if (!tenantUser) {
      this.uniqueViewUser[ctx.tenant] = tenantUser = {};
    }
    tenantUser[userId] = {expireAt, userInfo};
  }
  async getPresenceUniqueViewUser(ctx: EditorContext, nowUTC: number): Promise<UniqueUserRecord[]> {
    const res: UniqueUserRecord[] = [];
    let tenantUser = this.uniqueViewUser[ctx.tenant];
    if (!tenantUser) {
      this.uniqueViewUser[ctx.tenant] = tenantUser = {};
    }
    for (const userId in tenantUser) {
      if (Object.hasOwn(tenantUser, userId)) {
        if (tenantUser[userId].expireAt > nowUTC) {
          const elem = tenantUser[userId];
          const newElem: UniqueUserRecord = {userid: userId, expire: new Date(elem.expireAt * 1000)};
          Object.assign(newElem, elem.userInfo);
          res.push(newElem);
        } else {
          delete tenantUser[userId];
        }
      }
    }
    return res;
  }
  async addPresenceUniqueViewUsersOfMonth(ctx: EditorContext, userId: string, period: string | number, userInfo: unknown): Promise<void> {
    let tenantUser = this.uniqueViewUsersOfMonth[ctx.tenant];
    if (!tenantUser) {
      this.uniqueViewUsersOfMonth[ctx.tenant] = tenantUser = {};
    }
    if (!tenantUser[period]) {
      const expireAt = Date.now() + cfgExpMonthUniqueUsers;
      tenantUser[period] = {expireAt, data: {}};
    }
    tenantUser[period].data[userId] = userInfo;
  }
  async getPresenceUniqueViewUsersOfMonth(ctx: EditorContext): Promise<Record<string, Record<string, unknown>>> {
    const res: Record<string, Record<string, unknown>> = {};
    const nowUTC = Date.now();
    let tenantUser = this.uniqueViewUsersOfMonth[ctx.tenant];
    if (!tenantUser) {
      this.uniqueViewUsersOfMonth[ctx.tenant] = tenantUser = {};
    }
    for (const periodId in tenantUser) {
      if (Object.hasOwn(tenantUser, periodId)) {
        if (tenantUser[periodId].expireAt <= nowUTC) {
          delete tenantUser[periodId];
        } else {
          const date = new Date(parseInt(periodId)).toISOString();
          res[date] = tenantUser[periodId].data;
        }
      }
    }
    return res;
  }
  async setEditorConnections(
    ctx: EditorContext,
    countEdit: number,
    countLiveView: number,
    countView: number,
    now: number,
    precision: PrecisionEntry[]
  ): Promise<void> {
    let tenantStat = this.stat[ctx.tenant];
    if (!tenantStat) {
      this.stat[ctx.tenant] = tenantStat = [];
    }
    tenantStat.push({time: now, edit: countEdit, liveview: countLiveView, view: countView});
    let i = 0;
    // Preserved as-is: compares the sample object (not its .time) to a number, so it is
    // always false and nothing is ever trimmed. Fixing it would change behavior.
    while (i < tenantStat.length && (tenantStat[i] as unknown as number) < now - precision[precision.length - 1].val) {
      i++;
    }
    tenantStat.splice(0, i);
  }
  async getEditorConnections(ctx: EditorContext): Promise<EditorConnectionsSample[]> {
    let tenantStat = this.stat[ctx.tenant];
    if (!tenantStat) {
      this.stat[ctx.tenant] = tenantStat = [];
    }
    return tenantStat;
  }
  async setEditorConnectionsCountByShard(_ctx: EditorContext, _shardId: unknown, _count: number): Promise<void> {}
  async incrEditorConnectionsCountByShard(_ctx: EditorContext, _shardId: unknown, _count: number): Promise<void> {}
  async getEditorConnectionsCount(ctx: EditorContext, connections?: EditorConnection[] | null): Promise<number> {
    let count = 0;
    if (connections) {
      for (let i = 0; i < connections.length; ++i) {
        const conn = connections[i];
        if (!(conn.isCloseCoAuthoring || (conn.user && conn.user.view)) && ctx.tenant === tenantManager.getTenantByConnection(ctx, conn)) {
          count++;
        }
      }
    }
    return count;
  }
  async setViewerConnectionsCountByShard(_ctx: EditorContext, _shardId: unknown, _count: number): Promise<void> {}
  async incrViewerConnectionsCountByShard(_ctx: EditorContext, _shardId: unknown, _count: number): Promise<void> {}
  async getViewerConnectionsCount(ctx: EditorContext, connections?: EditorConnection[] | null): Promise<number> {
    let count = 0;
    if (connections) {
      for (let i = 0; i < connections.length; ++i) {
        const conn = connections[i];
        if (conn.isCloseCoAuthoring || (conn.user && conn.user.view && ctx.tenant === tenantManager.getTenantByConnection(ctx, conn))) {
          count++;
        }
      }
    }
    return count;
  }
  async setLiveViewerConnectionsCountByShard(_ctx: EditorContext, _shardId: unknown, _count: number): Promise<void> {}
  async incrLiveViewerConnectionsCountByShard(_ctx: EditorContext, _shardId: unknown, _count: number): Promise<void> {}
  async getLiveViewerConnectionsCount(ctx: EditorContext, connections?: EditorConnection[] | null): Promise<number> {
    let count = 0;
    if (connections) {
      for (let i = 0; i < connections.length; ++i) {
        const conn = connections[i];
        if (utils.isLiveViewer(conn) && ctx.tenant === tenantManager.getTenantByConnection(ctx, conn)) {
          count++;
        }
      }
    }
    return count;
  }
  async addShutdown(key: string, docId: string): Promise<void> {
    if (!this.shutdown[key]) {
      this.shutdown[key] = {};
    }
    this.shutdown[key][docId] = 1;
  }
  async removeShutdown(key: string, docId: string): Promise<void> {
    if (!this.shutdown[key]) {
      this.shutdown[key] = {};
    }
    delete this.shutdown[key][docId];
  }
  async getShutdownCount(key: string): Promise<number> {
    let count = 0;
    if (this.shutdown[key]) {
      for (const docId in this.shutdown[key]) {
        if (Object.hasOwn(this.shutdown[key], docId)) {
          count++;
        }
      }
    }
    return count;
  }
  async cleanupShutdown(key: string): Promise<void> {
    delete this.shutdown[key];
  }
  async setLicense(key: string, val: unknown): Promise<void> {
    this.license[key] = val;
  }
  async getLicense(key: string): Promise<unknown> {
    return this.license[key] || null;
  }
  async removeLicense(key: string): Promise<void> {
    delete this.license[key];
  }
  async lockNotification(ctx: EditorContext, notificationType: string, ttl: number): Promise<boolean> {
    //true NaN !== NaN
    return this._checkAndLock(ctx, notificationType, notificationType, NaN, ttl);
  }
  async deleteKey(_key: string): Promise<void> {
    //no need
  }
}

module.exports = {
  EditorData,
  EditorStat
};
