---
id: common
title: Shared library of the server (config, context, utils, storage, queue)
kind: module
parent: null
paths: [Common/sources/]
languages: null                   # tool — not computed yet
size: null                        # tool — not computed yet; packet estimate ~7,500 lines in 24 files [model]

base_commit: 32c34f2
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies:                     # tool — no graph.json yet
  uses: null
  used_by: null                   # estimate [model]: DocService, FileConverter, tests/unit
  fan_in: null
  fan_out: null

metrics:                          # tool — no metrics yet
  cpu_pct: null
  churn_90d: null
  coverage: null
  hotspot: null

oracle:
  level: partial
  sources: [unit tests (tests/unit/)]

verdict: null
---

## Responsibility
Shared CommonJS library loaded by DocService, FileConverter and the other services: configuration and per-tenant context, logging, HTTP/URL/crypto helpers, storage backends (fs, S3, Azure), the conversion task queue (RabbitMQ or ActiveMQ), error constants, command/data classes and file format detection [model]. It does not run a server or own any HTTP route; it holds no business logic for editing or converting documents [model].

## Entry points
Most required first, by grep count of `require` in the repo [model, rough].
- `operationContext.js` — `Context` (tenant, docId, userId, logger, `getCfg`, `initTenantCache`) and the `global` instance; passed as `ctx` to almost every function [model].
- `utils.js` — grab bag: `downloadUrlPromise`, `postRequestPromise`, `httpRequest` (SSRF-filtered requests), `fillResponse*`, base URL/domain from headers, IP/host filters, JWT helpers, `encryptPassword`/`decryptPassword`, `deepMergeObjects`, `getImpl`, license date math, `watchWithFallback` [model].
- `commondefines.js` — `InputCommand`, `TaskQueueData`, `OutputSfcData`, `ConvertStatus` and `c_oAsc*` enums [model].
- `tenantManager.js` — tenant resolution from domain, tenant config/secret/license, multitenant mode [model].
- `constants.js` — error codes (`NO_ERROR`, `CONVERT_*`…), defaults and regexes [model].
- `storage/storage-base.js` — storage facade (`getObject`, `putObject`, `getSignedUrl`, `listObjects`…) that picks `storage-fs`, `storage-s3` or `storage-az` by `storage.name` [model].
- `runtimeConfigManager.js`, `moduleReloader.js` — runtime config file (cache + file watch) and reloading the `config` npm module [model].
- `logger.js`, `reporters/` (Sentry), `statsdclient.js` — observability [model].
- `taskqueueRabbitMQ.js` — `TaskQueueRabbitMQ` EventEmitter for convert tasks/responses/delayed messages; `rabbitMQCore.js`, `activeMQCore.js` are the transports [model].
- `formatchecker.js`, `documentFormats.js` — format id ↔ extension and detection by signature [model].
- `mailService.js`, `notificationService.js`, `license.js`, `signing/cscOAuth.js` — smaller services [model].

## Main flow
1. Service start: `moduleReloader.requireConfigWithRuntime()` loads `config` merged with the runtime config file [model].
2. Each module reads `config.get(...)` once at load into `cfg*` constants (static defaults) [model].
3. Per request/connection, a `Context` is built (`initFromRequest`/`initFromConnection`) resolving the tenant via `tenantManager` [model].
4. `ctx.initTenantCache()` merges base config + runtime config + tenant config into `ctx.config`, cached per tenant [model].
5. Functions read tenant values with `ctx.getCfg(path, cfgDefault)` [model].
6. Outbound HTTP goes through `utils` with request-filtering agents and the `externalRequest` rules [model].
7. Files go through `storage-base`, prefixed by `cacheFolderName` and tenant path prefix [model].
8. Conversion work is serialized as `TaskQueueData` and sent through `TaskQueueRabbitMQ` [model].

## Invariants
- Outbound requests must keep SSRF protection: private addresses are blocked unless allowed by `externalRequest` config (`addExternalRequestOptions`) [model].
- `InputCommand` sets `withAuthorization` etc. explicitly to `undefined`; this is a security measure in the code comments, do not copy those fields from untrusted data [model].
- `encryptPassword` output format `iterationsHex:hex(salt|iv|authTag|data)` must stay readable by `decryptPassword` (stored in the DB) [model].
- Error code values in `constants.js` are part of the protocol with clients and integrators [model].
- `ctx.getCfg` must fall back to the static default when the tenant has no value [model].

## Pitfalls
- Circular requires: `utils` → `operationContext` → `tenantManager`/`runtimeConfigManager` → `utils`/`operationContext`. Load order matters; top-level use of a partly loaded module returns `undefined` [model].
- Side effects at load time: `utils.js` patches `BigInt.prototype.toJSON` and `Date.prototype.addMonths` (used by `getLicensePeriod`) and calls `win-ca`; every module needs `NODE_CONFIG_DIR` set (tests do it in `tests/env-setup.js`) [model].
- `ctx.getCfg` returns only the default until `initTenantCache()` runs: per-tenant overrides are silently ignored [model].
- Queue transport (RabbitMQ vs ActiveMQ) is chosen once at module load from `queue.type` [model].
- Path-validation helpers in `utils.js` are under a private security review [human].
- `axios` is required from `../node_modules/axios/dist/node/axios.cjs`; Jest maps it in `tests/jest.config.js` [model].
- Mixed styles: `co` generators, callbacks and async/await; `new Buffer` still used in `taskqueueRabbitMQ.js` [model].

## Hotspots
Nothing known: no profile yet. Likely costs: request helpers (stream piping, size limits) and `pbkdf2` in password encryption [model].

## Available oracle
Jest unit tests, run with `npm run "unit tests"` [model].
- Covered in `utils.js` (called by tests): `downloadUrlPromise`, `postRequestPromise` (`request.tests.js`, `requestSSRF.tests.js`), `encryptPassword`, `decryptPassword` (`utils.tests.js`), `watchWithFallback` (`watchWithFallback.tests.js`, `runtimeConfigManager.tests.js`). Indirectly: `addExternalRequestOptions`, `isAllowDirectRequest`, `changeOptionsForCompatibilityWithRequest`, `getFsType` [model].
- Not covered, pure (good first targets for PKT-0002): `addSeconds`, `getMillisecondsOfHour`, `encodeXml`, `getContentDisposition`, `mapAscServerErrorToOldError`, `compareStringByLength`, `containsAllAscii`, `containsAllAsciiNP`, `changeOnlyOfficeUrl`, `isEmptyObject`, `getSecretByElem` (`string` input; `file` input reads disk), `getJwtHsKey`, `getIndexFromUserId`, `checkPathTraversal`, `getDateTimeTicks`, `resolvePath`, `getMonthDiff`, `getLicensePeriod`, `removeIllegalCharacters`, `getFunctionArguments`, `isObject`, `deepMergeObjects`, `getImpl`, `convertLicenseInfoToFileParams`, `convertLicenseInfoToServerParams` [model].
- Not covered, need fakes (req/conn/fs/network): `httpRequest`, `fillResponse*`, `getBaseUrlByRequest`/`ByConnection`, `getDomainBy*`, `get{ShardKey,WopiSrc,SessionId}By*`, `checkIpFilter`, `checkHostFilter`, `checkClientIp`, `lowercaseQueryString`, `fillJwtForRequest`, `canIncludeOutboxAuthorization`, `checkBaseUrl`, `fsStat`, `listFolders`, `listObjects`, `readFile`, stream helpers, `stream2Buffer`, `checksumFile`, `dnsLookup` [model].
- Other files: `runtimeConfigManager`, `mailService`, `reporters/sentry` have tests; `operationContext` is exercised by all tests. No tests for `commondefines`, `formatchecker`, `tenantManager`, `storage/*`, `taskqueueRabbitMQ` [model].

## Open questions
- Is ActiveMQ used in any supported deployment, or only RabbitMQ? [model]
- (Moved to a private security review.) [human]
- Should `utils.js` be split (http, url, crypto, fs) before a TypeScript migration? [model]

## Lessons
Nothing yet.
