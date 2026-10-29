#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/backup-common.sh"
BACKUP_ROOT="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_ROOT"
BACKUP_ROOT="$(cd "$BACKUP_ROOT" && pwd -P)"
chmod 700 "$BACKUP_ROOT"
output="$(mktemp -d "$BACKUP_ROOT/.incompleto-estoque-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")"
container_tmp=""
cleanup() { if [[ -n "$container_tmp" ]]; then compose exec -T api node -e 'require("node:fs").rmSync(process.argv[1],{recursive:true,force:true})' "$container_tmp" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT
container_tmp="$(compose exec -T api node -e 'console.log(require("node:fs").mkdtempSync("/tmp/estoque-backup-"))')"
compose exec -T -e BACKUP_IMAGE_ID="$(image_api)" api node /app/scripts/database-backup.cjs create /data/"$(compose exec -T api node -e 'const p=require("node:path");const f=process.env.SQLITE_PATH;if(!f||p.dirname(f)!=="/data")process.exit(1);console.log(p.basename(f))')" "$container_tmp/copia" >&2
# Transfer only the two known files; the live WAL files are never copied independently.
compose exec -T api cat "$container_tmp/copia/estoque.sqlite" > "$output/estoque.sqlite"
compose exec -T api cat "$container_tmp/copia/manifesto.json" > "$output/manifesto.json"
chmod 600 "$output/estoque.sqlite" "$output/manifesto.json"
verify_backup "$output" >&2
name="${output##*/}"
final="$BACKUP_ROOT/${name#.incompleto-}"
[[ ! -e "$final" ]] || { echo 'Destino já existe.' >&2; exit 1; }
mv "$output" "$final"
printf '%s\n' "$final"
