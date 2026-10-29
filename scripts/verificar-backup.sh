#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/backup-common.sh"
[[ $# -eq 1 ]] || { echo 'Uso: ./scripts/verificar-backup.sh DIRETORIO_DO_BACKUP' >&2; exit 2; }
verify_backup "$1"
