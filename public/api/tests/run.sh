#!/bin/sh
# Relay P0 suite: php -l + static secret scan (scoped to public/api) + CLI harness.
# Zero real network (stubs), fictitious __FAKE__ token only.
# Run: PHP_BIN=/tmp/php-min/bin/php sh public/api/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/../../.."

PHP_BIN="${PHP_BIN:-php}"

echo "== 1 of 3: php -l =="
"$PHP_BIN" -l public/api/ghl.php
"$PHP_BIN" -l public/api/tests/harness.php

echo "== 2 of 3: static scan, no secret shapes in relay or tests =="
P_PIT='pit-[0-9a-fA-F-]{8,}'
P_JWT='eyJ[A-Za-z0-9_-]{10,}'
P_GOA='GO'"CSPX-"
P_OAUTH='1//0[A-Za-z0-9_-]'
P_SLACK='xox[bpas]-'
P_SK='sk-'"live-"
if grep -rE "$P_PIT|$P_JWT|$P_GOA|$P_OAUTH|$P_SLACK|$P_SK" public/api/ghl.php public/api/tests/harness.php; then
  echo "STATIC SCAN FAILED: secret-looking strings found above"
  exit 1
fi
echo "static scan clean"

echo "== 3 of 3: CLI harness, zero real network =="
"$PHP_BIN" public/api/tests/harness.php

echo "ALL GREEN"
