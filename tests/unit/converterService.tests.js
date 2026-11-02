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

// Characterization of convertJson/convertXml (PKT-0027): pins the current sync/async
// behaviour, the polling loop, CONVERT_TIMEOUT and the error statuses.

const {describe, test, expect, jest, beforeEach, afterEach} = require('@jest/globals');

jest.mock('./../../DocService/sources/taskresult', () => {
  const actual = jest.requireActual('./../../DocService/sources/taskresult');
  return {...actual, upsert: jest.fn(), select: jest.fn()};
});
jest.mock('./../../DocService/sources/DocsCoServer', () => ({
  getRequestParams: jest.fn(),
  addTask: jest.fn()
}));
jest.mock('./../../DocService/sources/canvasservice', () => ({
  cleanupErrToReload: jest.fn(),
  commandSfctByCmd: jest.fn()
}));
jest.mock('./../../DocService/sources/wopiClient', () => ({}));
jest.mock('./../../Common/sources/storage/storage-base', () => ({
  listObjects: jest.fn(),
  getSignedUrl: jest.fn()
}));

const taskResult = require('./../../DocService/sources/taskresult');
const docsCoServer = require('./../../DocService/sources/DocsCoServer');
const canvasService = require('./../../DocService/sources/canvasservice');
const storage = require('./../../Common/sources/storage/storage-base');
const utils = require('./../../Common/sources/utils');
const constants = require('./../../Common/sources/constants');
const commonDefines = require('./../../Common/sources/commondefines');
const operationContext = require('./../../Common/sources/operationContext');
const converterService = require('./../../DocService/sources/converterservice');

const FileStatus = commonDefines.FileStatus;
const TIMEOUT_MS = 3000;

let filled;
let sleeps;

function row(status, extra) {
  return {status, status_info: 0, last_open_date: new Date(), ...extra};
}
function auth(params) {
  docsCoServer.getRequestParams.mockResolvedValue({code: constants.NO_ERROR, params});
}
function baseParams(extra) {
  return {key: 'doc1', url: 'http://example.com/a.docx', filetype: 'docx', outputtype: 'pdf', ...extra};
}
async function run(params, opt_query, opt_xml) {
  auth(params);
  const req = {query: opt_query || {}, headers: {}};
  const fn = opt_xml ? converterService.convertXml : converterService.convertJson;
  await fn(req, {});
  return filled;
}

beforeEach(() => {
  filled = undefined;
  sleeps = [];
  jest.spyOn(operationContext.Context.prototype, 'initFromRequest').mockImplementation(() => {});
  jest.spyOn(operationContext.Context.prototype, 'initTenantCache').mockResolvedValue(undefined);
  jest.spyOn(utils, 'fillResponse').mockImplementation((req, res, status, isJson) => {
    filled = {status, isJson};
  });
  jest.spyOn(utils, 'sleep').mockImplementation(ms => {
    sleeps.push(ms);
    return Promise.resolve();
  });
  jest.spyOn(utils, 'getConvertionTimeout').mockReturnValue(TIMEOUT_MS);
  jest.spyOn(utils, 'getBaseUrlByRequest').mockReturnValue('http://base');
  docsCoServer.addTask.mockImplementation(() => [][Symbol.iterator]());
  storage.getSignedUrl.mockImplementation((ctx, baseUrl, p) => Promise.resolve(baseUrl + '/' + p));
  canvasService.cleanupErrToReload.mockResolvedValue(undefined);
  taskResult.upsert.mockResolvedValue({isInsert: true});
  delete process.env.DEFAULT_SHARD_KEY;
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  delete process.env.DEFAULT_SHARD_KEY;
});

describe('convertJson async mode', () => {
  test('async=true answers at once with end=false, queues the task, never polls', async () => {
    const r = await run(baseParams({async: true}));
    expect(r.isJson).toBe(true);
    expect(r.status.err).toBe(constants.NO_ERROR);
    expect(r.status.end).toBe(false);
    expect(docsCoServer.addTask).toHaveBeenCalledTimes(1);
    expect(taskResult.select).not.toHaveBeenCalled();
    expect(sleeps).toEqual([]);
  });

  test('async as the string "true" is async', async () => {
    const r = await run(baseParams({async: 'true'}));
    expect(r.status.end).toBe(false);
    expect(sleeps).toEqual([]);
  });

  test('DEFAULT_SHARD_KEY without shardkey query forces sync', async () => {
    process.env.DEFAULT_SHARD_KEY = 'x';
    taskResult.select.mockResolvedValue([row(FileStatus.Ok)]);
    const r = await run(baseParams({async: true}));
    expect(sleeps).toEqual([50]);
    expect(r.status.end).toBe(true);
  });

  test('DEFAULT_SHARD_KEY with shardkey query stays async', async () => {
    process.env.DEFAULT_SHARD_KEY = 'x';
    const r = await run(baseParams({async: true}), {[constants.SHARD_KEY_API_NAME]: 'doc1'});
    expect(r.status.end).toBe(false);
    expect(sleeps).toEqual([]);
  });
});

describe('convertJson sync mode polling loop', () => {
  test('sleeps with backoff 50 ms doubling to CONVERT_ASYNC_DELAY=1000 per poll until Ok and returns the signed url', async () => {
    taskResult.select
      .mockResolvedValueOnce([row(FileStatus.WaitQueue)])
      .mockResolvedValueOnce([row(FileStatus.WaitQueue)])
      .mockResolvedValueOnce([row(FileStatus.Ok)]);
    const r = await run(baseParams());
    expect(sleeps).toEqual([50, 100, 200]);
    expect(r.status.err).toBe(constants.NO_ERROR);
    expect(r.status.end).toBe(true);
    const docId = 'conv_doc1_' + constants.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDF;
    expect(r.status.url).toBe('http://base/' + docId + '/output.pdf');
    expect(r.status.filetype).toBe('pdf');
  });

  test('CONVERT_TIMEOUT after the poll whose waitTime exceeds the timeout (strict >)', async () => {
    taskResult.select.mockResolvedValue([row(FileStatus.WaitQueue)]);
    const r = await run(baseParams());
    // 3000 ms timeout: waitTime 50, 150, 350, 750, 1550, 2550 continue; 3550 > 3000 stops.
    expect(sleeps).toEqual([50, 100, 200, 400, 800, 1000, 1000]);
    expect(r.status.err).toBe(constants.CONVERT_TIMEOUT);
  });

  test('Err returns status_info', async () => {
    taskResult.select.mockResolvedValue([row(FileStatus.Err, {status_info: -4})]);
    const r = await run(baseParams());
    expect(r.status.err).toBe(-4);
    expect(canvasService.cleanupErrToReload).not.toHaveBeenCalled();
  });

  test('ErrToReload returns status_info and cleans up', async () => {
    taskResult.select.mockResolvedValue([row(FileStatus.ErrToReload, {status_info: -5})]);
    const r = await run(baseParams());
    expect(r.status.err).toBe(-5);
    expect(canvasService.cleanupErrToReload).toHaveBeenCalledTimes(1);
  });

  test('NeedParams maps to UNKNOWN', async () => {
    taskResult.select.mockResolvedValue([row(FileStatus.NeedParams)]);
    const r = await run(baseParams());
    expect(r.status.err).toBe(constants.UNKNOWN);
  });

  test('missing task row maps to UNKNOWN', async () => {
    taskResult.select.mockResolvedValue([]);
    const r = await run(baseParams());
    expect(r.status.err).toBe(constants.UNKNOWN);
  });

  test('stale last_open_date gives CONVERT_TIMEOUT even when Ok', async () => {
    taskResult.select.mockResolvedValue([row(FileStatus.Ok, {last_open_date: new Date(Date.now() - 10 * TIMEOUT_MS)})]);
    const r = await run(baseParams());
    expect(r.status.err).toBe(constants.CONVERT_TIMEOUT);
  });
});

describe('convertJson existing task', () => {
  test('existing Ok task is not re-queued and answers without sleeping', async () => {
    taskResult.upsert.mockResolvedValue({isInsert: false});
    taskResult.select.mockResolvedValue([row(FileStatus.Ok)]);
    const r = await run(baseParams());
    expect(docsCoServer.addTask).not.toHaveBeenCalled();
    expect(sleeps).toEqual([]);
    expect(r.status.end).toBe(true);
  });

  test('existing task with status None is re-queued', async () => {
    taskResult.upsert.mockResolvedValue({isInsert: false});
    taskResult.select.mockResolvedValueOnce([row(FileStatus.None)]).mockResolvedValue([row(FileStatus.Ok)]);
    const r = await run(baseParams());
    expect(docsCoServer.addTask).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([50]);
    expect(r.status.end).toBe(true);
  });
});

describe('convertJson request errors', () => {
  test('unknown outputtype gives CONVERT_PARAMS', async () => {
    const r = await run(baseParams({outputtype: 'nope'}));
    expect(r.status.err).toBe(constants.CONVERT_PARAMS);
    expect(taskResult.upsert).not.toHaveBeenCalled();
  });

  test('auth failure code is passed through', async () => {
    docsCoServer.getRequestParams.mockResolvedValue({code: constants.VKEY});
    await converterService.convertJson({query: {}, headers: {}}, {});
    expect(filled.status.err).toBe(constants.VKEY);
  });

  test('exception during conversion gives UNKNOWN', async () => {
    taskResult.upsert.mockRejectedValue(new Error('db down'));
    const r = await run(baseParams());
    expect(r.status.err).toBe(constants.UNKNOWN);
  });
});

describe('convertXml', () => {
  test('uses the same flow with isJson=false', async () => {
    const r = await run(baseParams({async: true}), undefined, true);
    expect(r.isJson).toBe(false);
    expect(r.status.end).toBe(false);
  });
});
