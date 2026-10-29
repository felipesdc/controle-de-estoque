#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
compose() { docker compose --project-directory "$ROOT" "$@"; }
image_api() { local image; image="$(compose images -q api)"; [[ -n "$image" && "$image" != *$'\n'* ]] || { echo 'Inicie/compile a API com docker compose up --build -d.' >&2; return 1; }; printf '%s\n' "$image"; }
absolute_dir() { [[ -d "$1" ]] || { echo 'Diretório de backup não encontrado.' >&2; return 1; }; (cd "$1" && pwd -P); }
verify_backup() { local dir image; dir="$(absolute_dir "$1")"; image="$(image_api)"; docker run --rm --user 0:0 --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,mode=1777 --mount "type=bind,src=$dir,dst=/backup,readonly" "$image" node /app/scripts/database-backup.cjs verify /backup; }
