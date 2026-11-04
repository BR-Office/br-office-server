/*
 * SPDX-FileCopyrightText: 2026 Euro-Office contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */
'use strict';

// Upstream fix 81132: a client that aborts while a cached file is streamed must not
// make the cache middleware send a status after the headers were sent.
const {describe, test, expect, jest, afterAll} = require('@jest/globals');
const http = require('http');
const crypto = require('crypto');
const {Readable} = require('stream');

let streamState;
jest.mock('../../Common/sources/storage/storage-base', () => ({
  needServeStatic: () => true,
  createReadStream: jest.fn(async () => {
    const readStream = new Readable({read() {}});
    streamState.readStream = readStream;
    // first chunk flushes the headers, the rest never comes
    readStream.push(Buffer.alloc(1024, 'a'));
    streamState.onStart();
    return {readStream, contentLength: 1024 * 1024};
  })
}));

const express = require('../../DocService/node_modules/express');
const config = require('../../Common/node_modules/config');
const operationContext = require('../../Common/sources/operationContext');
const router = require('../../DocService/sources/routes/static');

const cfgStorage = config.get('storage');
const origGetCfg = operationContext.Context.prototype.getCfg;
jest.spyOn(operationContext.Context.prototype, 'getCfg').mockImplementation(function (key, def) {
  const value = origGetCfg.call(this, key, def);
  return key === 'storage' ? {...value, name: 'storage-s3'} : value;
});

function signedPath() {
  const prefix = `/cache/${cfgStorage.storageFolderName}/${cfgStorage.cacheFolderName}`;
  const uri = '/doc1/output.docx';
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const md5 = crypto
    .createHash('md5')
    .update(expires + prefix + uri + cfgStorage.fs.secretString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return `${prefix}${uri}?md5=${md5}&expires=${expires}`;
}

describe('cache middleware client abort (upstream 81132)', () => {
  let server;
  afterAll(() => new Promise(resolve => (server ? server.close(resolve) : resolve())));

  test('aborting mid-stream does not send a status after headers were sent', async () => {
    const app = express();
    const sendStatus = jest.fn();
    const finished = new Promise(resolve => {
      app.use((req, res, next) => {
        const orig = res.sendStatus.bind(res);
        res.sendStatus = code => {
          sendStatus(code, res.headersSent);
          return orig(code);
        };
        res.on('close', () => setTimeout(resolve, 50));
        next();
      });
    });
    app.use(router);
    await new Promise(resolve => (server = app.listen(0, '127.0.0.1', resolve)));

    let clientReq;
    const gotHeaders = new Promise((resolve, reject) => {
      streamState = {onStart: () => {}};
      clientReq = http.get({host: '127.0.0.1', port: server.address().port, path: signedPath()}, res => {
        res.once('data', () => resolve(res.statusCode));
      });
      clientReq.on('error', () => {});
      setTimeout(() => reject(new Error('no response')), 5000);
    });
    expect(await gotHeaders).toBe(200);
    clientReq.destroy();
    await finished;

    expect(sendStatus).not.toHaveBeenCalled();
    expect(streamState.readStream.destroyed).toBe(true);
  });
});
