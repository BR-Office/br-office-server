#!/bin/sh
# Theseus oracle: the server unit tests, without the test that needs the internet.
# tests/unit/mailService.tests.js creates an account on api.nodemailer.com (Ethereal),
# so it fails in sandboxes without network access. See .theseus/adapter/oracle.md.
set -e
cd "$(dirname "$0")/../../DocService"
exec npx jest unit --inject-globals=false --config=../tests/jest.config.js --testPathIgnorePatterns=mailService "$@"
