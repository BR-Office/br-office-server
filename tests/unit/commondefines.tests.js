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

const constants = require('../../Common/sources/constants');
const commonDefines = require('../../Common/sources/commondefines');

const {InputCommand, TaskQueueData, OutputSfcData, CForceSaveData, CThumbnailData, CTextParams, CMailMergeSendData, OutputMailMerge, OutputAction, ConvertStatus} =
  commonDefines;

const roundTrip = obj => JSON.parse(JSON.stringify(obj));

describe('Characterization: constants protocol values', () => {
  test.each([
    ['DOC_ID_MAX_LENGTH', 240],
    ['USER_ID_MAX_LENGTH', 240],
    ['USER_NAME_MAX_LENGTH', 255],
    ['PASSWORD_MAX_LENGTH', 255],
    ['LICENSE_CONNECTIONS', 99999],
    ['LICENSE_USERS', 99999],
    ['NO_ERROR', 0],
    ['UNKNOWN', -1],
    ['READ_REQUEST_STREAM', -3],
    ['WEB_REQUEST', -4],
    ['CHANGE_DOC_INFO', -5],
    ['TASK_QUEUE', -20],
    ['TASK_RESULT', -40],
    ['STORAGE', -60],
    ['STORAGE_FILE_NO_FOUND', -61],
    ['STORAGE_READ', -62],
    ['STORAGE_WRITE', -63],
    ['STORAGE_REMOVE_DIR', -64],
    ['STORAGE_CREATE_DIR', -65],
    ['STORAGE_GET_INFO', -66],
    ['CONVERT', -80],
    ['CONVERT_DOWNLOAD', -81],
    ['CONVERT_UNKNOWN_FORMAT', -82],
    ['CONVERT_TIMEOUT', -83],
    ['CONVERT_READ_FILE', -84],
    ['CONVERT_DRM_UNSUPPORTED', -85],
    ['CONVERT_CORRUPTED', -86],
    ['CONVERT_LIBREOFFICE', -87],
    ['CONVERT_PARAMS', -88],
    ['CONVERT_NEED_PARAMS', -89],
    ['CONVERT_DRM', -90],
    ['CONVERT_PASSWORD', -91],
    ['CONVERT_ICU', -92],
    ['CONVERT_LIMITS', -93],
    ['CONVERT_TEMPORARY', -94],
    ['CONVERT_DETECT', -95],
    ['CONVERT_CELLLIMITS', -96],
    ['CONVERT_DEAD_LETTER', -99],
    ['UPLOAD', -100],
    ['UPLOAD_CONTENT_LENGTH', -101],
    ['UPLOAD_EXTENSION', -102],
    ['UPLOAD_COUNT_FILES', -103],
    ['UPLOAD_URL', -104],
    ['VKEY', -120],
    ['VKEY_ENCRYPT', -121],
    ['VKEY_KEY_EXPIRE', -122],
    ['VKEY_USER_COUNT_EXCEED', -123],
    ['VKEY_TIME_EXPIRE', -124],
    ['VKEY_TIME_INCORRECT', -125],
    ['EDITOR_CHANGES', -160],
    ['PASSWORD', -180],
    ['FORCED_VIEW_MODE', -200],
    ['FILE_NOT_ASSEMBLED', -201],
    ['QUEUE_PRIORITY_VERY_LOW', 2],
    ['QUEUE_PRIORITY_LOW', 3],
    ['QUEUE_PRIORITY_NORMAL', 4],
    ['QUEUE_PRIORITY_HIGH', 5],
    ['QUEUE_PRIORITY_VERY_HIGH', 6],
    ['EDITOR_TYPE_WORD', 0],
    ['EDITOR_TYPE_SPREADSHEET', 1],
    ['EDITOR_TYPE_PRESENTATION', 2],
    ['EDITOR_TYPE_CONVERTATION', 3],
    ['PACKAGE_TYPE_OS', 0],
    ['PACKAGE_TYPE_I', 1],
    ['PACKAGE_TYPE_D', 2],
    ['SHUTDOWN_CODE', 4001],
    ['SESSION_IDLE_CODE', 4002],
    ['SESSION_ABSOLUTE_CODE', 4003],
    ['ACCESS_DENIED_CODE', 4004],
    ['JWT_EXPIRED_CODE', 4005],
    ['JWT_ERROR_CODE', 4006],
    ['DROP_CODE', 4007],
    ['UPDATE_VERSION_CODE', 4008],
    ['NO_CACHE_CODE', 4009],
    ['RESTORE_CODE', 4010],
    ['QUIET_CODE', 4011],
    ['RECONNECT_FAILED_CODE', 4012]
  ])('%s === %d', (name, value) => {
    expect(constants[name]).toBe(value);
  });

  test.each([
    ['AVS_OFFICESTUDIO_FILE_UNKNOWN', 0x0000],
    ['AVS_OFFICESTUDIO_FILE_DOCUMENT', 0x0040],
    ['AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX', 0x0041],
    ['AVS_OFFICESTUDIO_FILE_DOCUMENT_HTML', 0x0046],
    ['AVS_OFFICESTUDIO_FILE_DOCUMENT_OFORM_PDF', 0x0057],
    ['AVS_OFFICESTUDIO_FILE_DOCUMENT_XML', 0x0070]
  ])('file format %s === %d', (name, value) => {
    expect(constants[name]).toBe(value);
  });

  test('doc id regexes', () => {
    expect(constants.DOC_ID_PATTERN).toBe('0-9-.a-zA-Z_=');
    expect(constants.DOC_ID_REGEX.test('abc-1.2_x=')).toBe(true);
    expect(constants.DOC_ID_REGEX.test('a/b')).toBe(false);
    expect('a/b c'.replace(constants.DOC_ID_REPLACE_REGEX, '')).toBe('abc');
    expect(constants.CHAR_DELIMITER).toBe('\u0005');
  });
});

describe('Characterization: commondefines enums', () => {
  test.each([
    ['c_oPublishType', {drop: 0, releaseLock: 1, participantsState: 2, message: 3, getLock: 4, changes: 5, auth: 6, receiveTask: 7, warning: 8, cursor: 9, shutdown: 10, meta: 11, forceSave: 12, closeConnection: 13, changesNotify: 14, changeConnecitonInfo: 15, rpc: 16, updateVersion: 17}],
    ['c_oAscCsvDelimiter', {None: 0, Tab: 1, Semicolon: 2, Colon: 3, Comma: 4, Space: 5}],
    ['c_oAscUserAction', {Out: 0, In: 1, ForceSaveButton: 2}],
    ['c_oAscServerCommandErrors', {NoError: 0, DocumentIdError: 1, ParseError: 2, UnknownError: 3, NotModified: 4, UnknownCommand: 5, Token: 6, TokenExpire: 7}],
    ['c_oAscForceSaveTypes', {Command: 0, Button: 1, Timeout: 2, Form: 3, Internal: 4}],
    ['c_oAscUrlTypes', {Session: 0, Temporary: 1}],
    ['c_oAscSecretType', {Browser: 0, Inbox: 1, Outbox: 2, Session: 3}],
    ['c_oAscQueueType', {rabbitmq: 'rabbitmq', activemq: 'activemq'}],
    ['c_oAscUnlockRes', {Locked: 0, Unlocked: 1, Empty: 2}],
    ['FileStatus', {None: 0, Ok: 1, WaitQueue: 2, NeedParams: 3, Err: 5, ErrToReload: 6, SaveVersion: 7, UpdateVersion: 8, NeedPassword: 9}]
  ])('%s', (name, expected) => {
    expect(commonDefines[name]).toEqual(expected);
  });

  test('encodings table and map are consistent; utf8 code page index', () => {
    expect(commonDefines.c_oAscEncodings).toHaveLength(52);
    expect(commonDefines.c_oAscCodePageUtf8).toBe(46);
    expect(commonDefines.c_oAscEncodings[46]).toEqual([46, 65001, 'UTF-8', 'Unicode (UTF-8)']);
    for (const [index, codePage] of commonDefines.c_oAscEncodings) {
      expect(commonDefines.c_oAscEncodingsMap[codePage]).toBe(index);
    }
    expect(Object.keys(commonDefines.c_oAscEncodingsMap)).toHaveLength(52);
  });

  test('build version and number (patched by the Makefile, values not asserted)', () => {
    expect(typeof commonDefines.buildVersion).toBe('string');
    // Surprise: buildNumber is a number literal in source, not a string.
    expect(typeof commonDefines.buildNumber).toBe('number');
  });
});

describe('Characterization: InputCommand', () => {
  const explicit = {
    withAuthorization: true,
    externalChangeInfo: {a: 1},
    wopiParams: {w: 1},
    builderParams: {b: 1},
    userconnectiondocid: 'ucd',
    originformat: 'docx'
  };

  test('no data: every field is undefined except nobase64 = true', () => {
    const cmd = new InputCommand();
    expect(cmd.getCommand()).toBeUndefined();
    expect(cmd.getDocId()).toBeUndefined();
    expect(cmd).toHaveProperty('withAuthorization', undefined);
    // Surprise: the no-data branch defaults nobase64 to true, the data branch copies it.
    expect(roundTrip(cmd)).toEqual({nobase64: true});
  });

  test('copies plain fields from data', () => {
    const cmd = new InputCommand({c: 'open', id: 'doc1', userid: 'u1', title: 't.docx', outputformat: 65, password: 'p'});
    expect(cmd.getCommand()).toBe('open');
    expect(cmd.getDocId()).toBe('doc1');
    expect(cmd.getUserId()).toBe('u1');
    expect(cmd.getTitle()).toBe('t.docx');
    expect(cmd.getOutputFormat()).toBe(65);
    expect(cmd.getPassword()).toBe('p');
  });

  test('security fields are dropped without copyExplicit', () => {
    const cmd = new InputCommand({c: 'open', ...explicit});
    for (const key of ['withAuthorization', 'externalChangeInfo', 'wopiParams', 'builderParams', 'userconnectiondocid']) {
      expect(cmd[key]).toBeUndefined();
    }
    // Surprise: originformat is not initialised at all when data is given without copyExplicit.
    expect(Object.prototype.hasOwnProperty.call(cmd, 'originformat')).toBe(false);
    expect(roundTrip(cmd)).toEqual({c: 'open'});
  });

  test('security fields are kept with copyExplicit', () => {
    const cmd = new InputCommand({c: 'open', ...explicit}, true);
    expect(roundTrip(cmd)).toEqual({c: 'open', ...explicit});
    expect(cmd.getWopiParams()).toEqual({w: 1});
  });

  test('nested objects become typed instances; falsy ones become undefined', () => {
    const cmd = new InputCommand({
      forcesave: {type: 1, time: 2, index: 'i', authoruserid: 'a', authoruserindex: 3},
      thumbnail: {aspect: 1, first: true, width: 10, height: 20},
      textParams: {association: 5},
      mailmergesend: {from: 'f', to: 't', recordCount: 2}
    });
    expect(cmd.getForceSave()).toBeInstanceOf(CForceSaveData);
    expect(cmd.getForceSave().getType()).toBe(1);
    expect(cmd.getThumbnail()).toBeInstanceOf(CThumbnailData);
    expect(cmd.getThumbnail().getWidth()).toBe(10);
    expect(cmd.getTextParams()).toBeInstanceOf(CTextParams);
    expect(cmd.getTextParams().getAssociation()).toBe(5);
    expect(cmd.getMailMergeSend()).toBeInstanceOf(CMailMergeSendData);
    expect(cmd.getMailMergeSend().getRecordCount()).toBe(2);
    expect(new InputCommand({forcesave: null}).getForceSave()).toBeUndefined();
  });

  test('JSON round trip through constructor preserves plain fields', () => {
    const src = new InputCommand({c: 'save', id: 'd', savekey: 'k', forcesave: {type: 0, time: 1, index: 'x', authoruserid: 'u', authoruserindex: 1}});
    const copy = new InputCommand(roundTrip(src));
    expect(roundTrip(copy)).toEqual(roundTrip(src));
  });

  test('setters and fillFromConnection', () => {
    const cmd = new InputCommand();
    cmd.setCommand('x');
    cmd.setDocId('d');
    cmd.setWithAuthorization(true);
    expect(cmd.getCommand()).toBe('x');
    expect(cmd.getWithAuthorization()).toBe(true);
    cmd.fillFromConnection({docId: 'fromConn'});
    expect(cmd.getDocId()).toBe('fromConn');
  });
});

describe('Characterization: nested data classes', () => {
  test('defaults are null', () => {
    expect(roundTrip(new CForceSaveData())).toEqual({type: null, time: null, index: null, authoruserid: null, authoruserindex: null});
    expect(roundTrip(new CThumbnailData())).toEqual({format: null, aspect: null, first: null, width: null, height: null});
    expect(roundTrip(new CTextParams())).toEqual({association: null});
    expect(Object.values(roundTrip(new CMailMergeSendData())).every(v => v === null)).toBe(true);
  });

  test('CMailMergeSendData isJson accessor name', () => {
    const m = new CMailMergeSendData({isJson: true, jsonkey: 'k'});
    expect(m.getIsJsonKey()).toBe(true);
    expect(m.getJsonKey()).toBe('k');
  });
});

describe('Characterization: TaskQueueData', () => {
  test('no data: all undefined', () => {
    const t = new TaskQueueData();
    expect(t.getCmd()).toBeUndefined();
    expect(roundTrip(t)).toEqual({});
  });

  test('cmd is rebuilt with copyExplicit=true (security fields survive the queue)', () => {
    const t = new TaskQueueData({ctx: {c: 1}, cmd: {c: 'conv', withAuthorization: true, wopiParams: {w: 1}}, toFile: 'f', paid: true, visibilityTimeout: 5});
    expect(t.getCmd()).toBeInstanceOf(InputCommand);
    expect(t.getCmd().getWithAuthorization()).toBe(true);
    expect(t.getCmd().getWopiParams()).toEqual({w: 1});
    expect(t.getToFile()).toBe('f');
    const copy = new TaskQueueData(roundTrip(t));
    expect(roundTrip(copy)).toEqual(roundTrip(t));
  });

  test('missing cmd still yields an empty InputCommand (nobase64 = true)', () => {
    const t = new TaskQueueData({toFile: 'f'});
    expect(t.getCmd()).toBeInstanceOf(InputCommand);
    expect(roundTrip(t)).toEqual({cmd: {nobase64: true}, toFile: 'f'});
  });

  test('setters return the assigned value', () => {
    const t = new TaskQueueData();
    expect(t.setPaid(true)).toBe(true);
    expect(t.setDataKey('k')).toBe('k');
  });
});

describe('Characterization: OutputSfcData', () => {
  test('construction and JSON', () => {
    const o = new OutputSfcData('key1');
    expect(roundTrip(o)).toEqual({key: 'key1'});
    o.setStatus(2);
    o.setUrl('http://u');
    o.setExtName('.docx');
    o.setToken('tok');
    expect(o.getExtName()).toBe('docx');
    expect(roundTrip(o)).toEqual({key: 'key1', status: 2, url: 'http://u', filetype: 'docx', token: 'tok'});
  });

  test('formsdataurl accessor writes a different field than the formdata slot', () => {
    const o = new OutputSfcData('k');
    o.setFormsDataUrl('http://f');
    expect(o.getFormsDataUrl()).toBe('http://f');
    expect(o.formdata).toBeUndefined();
  });

  test('void setters return undefined', () => {
    const o = new OutputSfcData('k');
    expect(o.setLastSave('t')).toBeUndefined();
    expect(o.getLastSave()).toBe('t');
  });
});

describe('Characterization: OutputMailMerge, OutputAction, ConvertStatus', () => {
  test.each([
    [constants.AVS_OFFICESTUDIO_FILE_DOCUMENT_HTML, 0],
    [constants.AVS_OFFICESTUDIO_FILE_DOCUMENT_DOCX, 1],
    [constants.AVS_OFFICESTUDIO_FILE_CROSSPLATFORM_PDF, 2],
    [12345, 0]
  ])('mail format %d maps to type %d', (mailFormat, type) => {
    const m = new OutputMailMerge(new CMailMergeSendData({from: 'f', mailFormat, fileName: 'n', recordCount: 3}));
    expect(m.type).toBe(type);
    expect(m.title).toBe('n');
    expect(m.getTo()).toBeNull();
    expect(m.getRecordIndex()).toBeNull();
  });

  test('OutputMailMerge without data', () => {
    expect(Object.values(roundTrip(new OutputMailMerge())).every(v => v === null)).toBe(true);
  });

  test('OutputAction', () => {
    expect(roundTrip(new OutputAction(1, 'u'))).toEqual({type: 1, userid: 'u'});
  });

  test('ConvertStatus end flag follows url', () => {
    const s = new ConvertStatus(0);
    expect(s.end).toBe(false);
    s.setUrl('http://x');
    expect(s.end).toBe(true);
    s.setExtName('.pdf');
    expect(s.filetype).toBe('pdf');
    expect(new ConvertStatus(0, 'u', 'docx').end).toBe(true);
  });
});
