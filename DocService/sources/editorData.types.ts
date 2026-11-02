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

// Type-only module: the contract every editor data backend (the in-memory one in
// editorDataMemory.ts, Redis and others outside this repository) must meet.
// Types are erased at build time: ts-strip.js emits an empty module, and nothing
// here is enforced on JavaScript callers.

/** The subset of operationContext the backends read. */
export interface EditorContext {
  tenant: string;
}

/** A connection as seen by the backends (opaque apart from these fields). */
export interface EditorConnection {
  docId?: string;
  isCloseCoAuthoring?: boolean;
  user?: {view?: boolean};
  [key: string]: unknown;
}

/** commonDefines.c_oAscUnlockRes values. */
export type UnlockResult = number;

export type LockMap = Record<string, unknown>;

export interface AddLocksNXResult {
  lockConflict: LockMap;
  allLocks: LockMap;
}

export interface ForceSaveState {
  time: unknown;
  index: unknown;
  baseUrl: unknown;
  changeInfo: unknown;
  started: unknown;
  ended: unknown;
  convertInfo: unknown;
}

export interface UniqueUserRecord {
  userid: string;
  expire: Date;
  [key: string]: unknown;
}

export interface EditorConnectionsSample {
  time: number;
  edit: number;
  liveview: number;
  view: number;
}

export interface PrecisionEntry {
  val: number;
  [key: string]: unknown;
}

/** Lifecycle shared by EditorData and EditorStat. */
export interface EditorCommonContract {
  connect(): Promise<void>;
  isConnected(): boolean;
  ping(): Promise<string>;
  close(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface EditorDataContract extends EditorCommonContract {
  addPresence(ctx: EditorContext, docId: string, userId: string, userInfo: unknown): Promise<void>;
  updatePresence(ctx: EditorContext, docId: string, userId: string): Promise<void>;
  removePresence(ctx: EditorContext, docId: string, userId: string): Promise<void>;
  getPresence(ctx: EditorContext, docId: string, connections?: EditorConnection[] | null): Promise<string[]>;

  lockSave(ctx: EditorContext, docId: string, userId: unknown, ttl: number): Promise<boolean>;
  unlockSave(ctx: EditorContext, docId: string, userId: unknown): Promise<UnlockResult>;
  lockAuth(ctx: EditorContext, docId: string, userId: unknown, ttl: number): Promise<boolean>;
  unlockAuth(ctx: EditorContext, docId: string, userId: unknown): Promise<UnlockResult>;

  getDocumentPresenceExpired(now: number): Promise<unknown[]>;
  removePresenceDocument(ctx: EditorContext, docId: string): Promise<void>;

  addLocks(ctx: EditorContext, docId: string, locks: LockMap): Promise<void>;
  addLocksNX(ctx: EditorContext, docId: string, locks: LockMap): Promise<AddLocksNXResult>;
  removeLocks(ctx: EditorContext, docId: string, locks: LockMap): Promise<void>;
  removeAllLocks(ctx: EditorContext, docId: string): Promise<void>;
  getLocks(ctx: EditorContext, docId: string): Promise<LockMap>;

  addMessage(ctx: EditorContext, docId: string, msg: unknown): Promise<void>;
  removeMessages(ctx: EditorContext, docId: string): Promise<void>;
  getMessages(ctx: EditorContext, docId: string): Promise<unknown[]>;

  setSaved(ctx: EditorContext, docId: string, status: unknown): Promise<void>;
  getdelSaved(ctx: EditorContext, docId: string): Promise<unknown>;
  setForceSave(
    ctx: EditorContext,
    docId: string,
    time: unknown,
    index: unknown,
    baseUrl: unknown,
    changeInfo: unknown,
    convertInfo: unknown
  ): Promise<void>;
  getForceSave(ctx: EditorContext, docId: string): Promise<ForceSaveState | null>;
  checkAndStartForceSave(ctx: EditorContext, docId: string): Promise<ForceSaveState | undefined>;
  checkAndSetForceSave(
    ctx: EditorContext,
    docId: string,
    time: unknown,
    index: unknown,
    started: unknown,
    ended: unknown,
    convertInfo: unknown
  ): Promise<ForceSaveState | undefined>;
  removeForceSave(ctx: EditorContext, docId: string): Promise<void>;

  cleanDocumentOnExit(ctx: EditorContext, docId: string): Promise<void>;

  addForceSaveTimerNX(ctx: EditorContext, docId: string, expireAt: number): Promise<void>;
  /** Returns [tenant, docId] pairs whose timer expired, and removes them. */
  getForceSaveTimer(now: number): Promise<Array<[string, string]>>;
}

export interface EditorStatContract extends EditorCommonContract {
  addPresenceUniqueUser(ctx: EditorContext, userId: string, expireAt: number, userInfo: unknown): Promise<void>;
  getPresenceUniqueUser(ctx: EditorContext, nowUTC: number): Promise<UniqueUserRecord[]>;
  addPresenceUniqueUsersOfMonth(ctx: EditorContext, userId: string, period: string | number, userInfo: unknown): Promise<void>;
  getPresenceUniqueUsersOfMonth(ctx: EditorContext): Promise<Record<string, Record<string, unknown>>>;

  addPresenceUniqueViewUser(ctx: EditorContext, userId: string, expireAt: number, userInfo: unknown): Promise<void>;
  getPresenceUniqueViewUser(ctx: EditorContext, nowUTC: number): Promise<UniqueUserRecord[]>;
  addPresenceUniqueViewUsersOfMonth(ctx: EditorContext, userId: string, period: string | number, userInfo: unknown): Promise<void>;
  getPresenceUniqueViewUsersOfMonth(ctx: EditorContext): Promise<Record<string, Record<string, unknown>>>;

  setEditorConnections(
    ctx: EditorContext,
    countEdit: number,
    countLiveView: number,
    countView: number,
    now: number,
    precision: PrecisionEntry[]
  ): Promise<void>;
  getEditorConnections(ctx: EditorContext): Promise<EditorConnectionsSample[]>;

  setEditorConnectionsCountByShard(ctx: EditorContext, shardId: unknown, count: number): Promise<void>;
  incrEditorConnectionsCountByShard(ctx: EditorContext, shardId: unknown, count: number): Promise<void>;
  getEditorConnectionsCount(ctx: EditorContext, connections?: EditorConnection[] | null): Promise<number>;
  setViewerConnectionsCountByShard(ctx: EditorContext, shardId: unknown, count: number): Promise<void>;
  incrViewerConnectionsCountByShard(ctx: EditorContext, shardId: unknown, count: number): Promise<void>;
  getViewerConnectionsCount(ctx: EditorContext, connections?: EditorConnection[] | null): Promise<number>;
  setLiveViewerConnectionsCountByShard(ctx: EditorContext, shardId: unknown, count: number): Promise<void>;
  incrLiveViewerConnectionsCountByShard(ctx: EditorContext, shardId: unknown, count: number): Promise<void>;
  getLiveViewerConnectionsCount(ctx: EditorContext, connections?: EditorConnection[] | null): Promise<number>;

  addShutdown(key: string, docId: string): Promise<void>;
  removeShutdown(key: string, docId: string): Promise<void>;
  getShutdownCount(key: string): Promise<number>;
  cleanupShutdown(key: string): Promise<void>;

  setLicense(key: string, val: unknown): Promise<void>;
  getLicense(key: string): Promise<unknown>;
  removeLicense(key: string): Promise<void>;

  lockNotification(ctx: EditorContext, notificationType: string, ttl: number): Promise<boolean>;
  deleteKey(key: string): Promise<void>;
}
