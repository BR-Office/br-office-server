#!/bin/sh
# Theseus oracle: the server unit tests, without the test that needs the internet.
# tests/unit/mailService.tests.js creates an account on api.nodemailer.com (Ethereal),
# so it fails in sandboxes without network access. See .theseus/adapter/oracle.md.
set -e
# Rebuild the JavaScript emitted from TypeScript sources first, so a stale or missing
# DocService/sources/*.js can never satisfy the oracle (see .theseus/adapter/interop-javascript-typescript.md).
node "$(dirname "$0")/../../ts-strip.js"
cd "$(dirname "$0")/../../DocService"
exec npx jest unit --inject-globals=false --config=../tests/jest.config.js --testPathIgnorePatterns=mailService "$@"
