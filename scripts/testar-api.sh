#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image="${API_TEST_IMAGE:-controle-de-estoque-api:latest}"
count=0
for file in apps/api/tests/*.cjs; do
  name="$(basename "$file")"
  case "$name" in seed-*|backup-fixture.cjs|http.cjs|persistence.cjs) continue;; esac
  printf '\nTeste: %s\n' "$name"
  docker run --rm --network none -e SQLITE_PATH=:memory: \
    -e ADMIN_PASSWORD=security-qa-only-2026 \
    -e JWT_SECRET=security-qa-jwt-secret-only-local-2026 \
    -e AUTH_ENCRYPTION_KEY=BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc= \
    -v "$PWD/apps/api/tests:/tests:ro" "$image" node "/tests/$name"
  count=$((count+1))
done
printf '\nPASS: %s arquivos de testes da API.\n' "$count"
