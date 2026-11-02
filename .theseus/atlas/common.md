---
id: common
title: Shared library for all server services
kind: module
parent: null
paths: [Common/]
languages: null                   # tool — not available: no graph.json yet
size: null                        # tool — not available: no graph.json yet

base_commit: 59fa3ad
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current                # tool

dependencies:                     # tool — not available: no graph.json yet
  uses: null
  used_by: null
  fan_in: null
  fan_out: null

metrics:                          # tool — not available
  cpu_pct: null
  churn_90d: null
  coverage: null
  hotspot: null

oracle:
  level: partial
  sources: [tests/unit (utils, runtimeConfigManager, request, requestSSRF, sentryReporter), .theseus/oracle/unit.sh]

verdict: null
---

## Responsibility
Shared Node.js library required by DocService, FileConverter, AdminPanel and SpellChecker: configuration, per-request operation context, tenants and licenses, storage backends (fs/S3/Azure), message queues (RabbitMQ/ActiveMQ), logging, and the task/command data types exchanged between services. [model] It does not serve HTTP or convert documents itself; it holds no service entry point. [model]

## Entry points
- `Common/sources/operationContext.js` — `Context` (tenant, docId, userId, shardKey, wopiSrc, per-tenant config via `getCfg`), `global` singleton, `initFrom{Request,Connection,TaskQueueData,PubSub}`.
- `Common/sources/tenantManager.js` — tenant resolution from host/domain, tenant config/secret/license, multitenant flag.
- `Common/sources/runtimeConfigManager.js` — runtime config file read/save and file watcher.
- `Common/sources/moduleReloader.js` — `requireConfigWithRuntime`, `finalizeConfigWithRuntime`, `getBaseConfig`.
- `Common/sources/storage/storage-base.js` — storage facade (get/put/copy/list/delete, signed URLs, healthCheck) dispatching to `storage-fs|s3|az.js` by `storage.name`.
- `Common/sources/taskqueueRabbitMQ.js` — `TaskQueueRabbitMQ` EventEmitter: `addTask`, `addResponse`, `addDelayed`, `healthCheck`; backed by `rabbitMQCore.js` or `activeMQCore.js`.
- `Common/sources/commondefines.js` — `InputCommand`, `TaskQueueData`, `OutputSfcData`, `ConvertStatus` and other DTOs.
- `Common/sources/utils.js` — large grab bag: downloads with SSRF filtering, JWT helpers, deep merge, `getImpl`, shard/WOPI/session extraction from requests.
- `Common/sources/logger.js`, `constants.js`, `formatchecker.js`, `documentFormats.js`, `license.js`, `mailService.js`, `notificationService.js`, `statsdclient.js`, `reporters/` (Sentry).
- `Common/config/default.json` + platform overlays + `schemas/config.schema.json` — the `config` package configuration used by every service.

## Main flow
1. A service starts by loading `config` (optionally via `moduleReloader.requireConfigWithRuntime`, which reloads `config` with the runtime file merged through `NODE_CONFIG`, then restores the env). [model]
2. Module-level code in Common reads `config.get(...)` once at require time into `cfg*` constants. [model]
3. Each request/socket/queue message gets a `Context`, initialised from the request host (→ tenant), doc id, user. [model]
4. `ctx.initTenantCache()` merges base config + runtime config + tenant config and caches it per tenant. [model]
5. Code reads settings via `ctx.getCfg(path, default)`, so tenant overrides win over module-level defaults. [model]
6. Storage calls prefix paths with `cacheFolderName` (or a special dir) and the tenant prefix, then dispatch to the configured backend. [model]
7. Conversion work travels as `TaskQueueData` JSON through `TaskQueueRabbitMQ`; the receiver rebuilds `Context` with `initFromTaskQueueData`. [model]

## Invariants
- Every storage key is `<specialDir>/<tenantPrefix><path>` with backslashes normalised; tenants must never share keys. [model]
- `persistentStorage` config always inherits from `storage` (`normalizePersistentStorageCfg`). [model]
- `Context.toJSON()` fields are the wire format of the context across queues/pubsub; changing them breaks cross-service messages. [model]
- `NODE_CONFIG` must be restored after runtime config load (avoids E2BIG on Windows/pkg). [model]

## Pitfalls
- Circular requires: `utils` ↔ `operationContext` ↔ `tenantManager`/`runtimeConfigManager`; require order matters. [model]
- Settings read at module load (`cfg*` constants) ignore tenant/runtime overrides; only `ctx.getCfg` sees them. [model]
- Per-tenant config cache is module-global; it must be invalidated by `cleanTenantConfigCache`/`cleanRuntimeConfigCache` after edits. [model]
- `getDefautTenant` is misspelled and exported under that name. [model]
- Tenant is derived from the host header: `a.<baseDomain>` → `a`, otherwise the full domain. [model]
- `TaskQueueRabbitMQ` buffers `addTask`/`addDelayed` in memory while the channel is down. [model]
- `utils.js` imports axios via a hard path `../node_modules/axios/dist/node/axios.cjs`. [model]
- Common has its own `node_modules` and `npm-shrinkwrap.json`. [model]

## Hotspots
Nothing known (no profile available).

## Available oracle
`.theseus/oracle/unit.sh` runs `tests/unit` with Jest from DocService; it covers `utils`, `runtimeConfigManager`, request/SSRF filtering and the Sentry reporter. [model] No unit tests seen for storage backends, task queues, tenantManager or operationContext; those depend on integration tests (`tests/integration`) needing live services. [model]

## Open questions
- Full dependency graph and sizes: needs `graph.json` from the adapter tools.
- Should `utils.js` (~1,500 lines, many concerns) get its own card or be split?
- Is ActiveMQ still a supported production path or legacy?
- Are `license` and `secret` meant to be cached in `Context` (see `//todo license and secret` in `initTenantCache`)?

## Lessons
Nothing known yet.
