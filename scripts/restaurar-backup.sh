#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/backup-common.sh"
[[ $# -eq 1 ]] || { echo 'Uso: ./scripts/restaurar-backup.sh DIRETORIO_DO_BACKUP' >&2; exit 2; }
source_dir="$(absolute_dir "$1")"
verify_backup "$source_dir"
# Resolve the actual running service and its named volume, without reading secrets.
cid="$(compose ps -q api)"
[[ -n "$cid" ]] || { echo 'A API deve estar em execução para criar o backup anterior à restauração.' >&2; exit 1; }
volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{if eq .Type "volume"}}{{.Name}}{{end}}{{end}}{{end}}' "$cid")"
[[ -n "$volume" ]] || { echo 'Restauração exige o volume nomeado da API em /data.' >&2; exit 1; }
target="$(compose exec -T api node -p 'process.env.SQLITE_PATH')"
[[ "$target" == /data/*.sqlite && "${target#/data/}" != */* ]] || { echo 'Destino SQLite inesperado.' >&2; exit 1; }
image="$(image_api)"
rollback_dir=''
stopped=0
helper() { docker run --rm --user 0:0 --network none --read-only --tmpfs /tmp:rw,nosuid,nodev,mode=1777 --mount "type=volume,src=$volume,dst=/data" --mount "type=bind,src=$source_dir,dst=/backup,readonly" -e RESTORE_STOPPED_API=1 "$image" node /app/scripts/database-backup.cjs "$@"; }
lock_id="$(helper lock)"
recover() {
 local status=$?; trap - EXIT
 if [[ $status -ne 0 && "$stopped" == 1 ]]; then
  compose stop api >/dev/null 2>&1 || true
  if [[ -n "$rollback_dir" ]]; then
   helper rollback "$rollback_dir" "$target" >&2 || { echo 'Rollback automático falhou; a API permanece parada. Use o backup anterior informado. Bloqueio mantido em /data/.restore-lock.' >&2; exit "$status"; }
  fi
  compose start api >&2 || true
 fi
 helper unlock "$lock_id" >&2 || true
 exit "$status"
}
trap recover EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
echo 'Criando backup de segurança do estado atual...' >&2
previous="$("$ROOT/scripts/backup.sh")"
echo "Backup anterior: $previous" >&2
stopped=1
compose stop api >&2
rollback_dir="$(helper install /backup "$target")"
compose start api >&2
healthy=0
for attempt in {1..30}; do
 if compose exec -T api node -e 'fetch("http://127.0.0.1:3000/health",{signal:AbortSignal.timeout(1500)}).then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then healthy=1; break; fi
 sleep 1
done
[[ "$healthy" == 1 ]] || { echo 'A API restaurada falhou na verificação; recuperando o banco anterior.' >&2; exit 1; }
stopped=0
helper unlock "$lock_id"
trap - EXIT INT TERM
echo 'Restauração concluída. Entre novamente: as sessões do backup foram invalidadas.'
echo "Backup do estado anterior: $previous"
echo "Arquivos anteriores preservados no volume: $rollback_dir"
