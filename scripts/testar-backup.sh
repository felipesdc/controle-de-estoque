#!/usr/bin/env bash
set -euo pipefail
umask 077
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export COMPOSE_FILE="$ROOT/apps/api/tests/backup-qa.compose.yaml"
export COMPOSE_PROJECT_NAME=estoque-backup-qa
source "$ROOT/scripts/backup-common.sh"
work="$(mktemp -d "${TMPDIR:-/tmp}/estoque-backup-test.XXXXXX")"
export BACKUP_DIR="$work/copias"
cleanup() { compose down -v >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT
compose up -d --wait
compose exec -T api node < "$ROOT/apps/api/tests/backup-fixture.cjs"
original="$("$ROOT/scripts/backup.sh")"
"$ROOT/scripts/verificar-backup.sh" "$original"
# Another restore must not pass the volume lock or stop the running API.
lock_id="$(compose exec -T -u 0 api node /app/scripts/database-backup.cjs lock)"
if "$ROOT/scripts/restaurar-backup.sh" "$original" >/dev/null 2>&1; then echo 'ERRO: restauração concorrente aceitou o bloqueio.' >&2; exit 1; fi
compose exec -T -u 0 api node /app/scripts/database-backup.cjs unlock "$lock_id"
# A corrupted file must be rejected before stopping any API.
cp -R "$original" "$work/corrompido"
printf 'corrompido' >> "$work/corrompido/estoque.sqlite"
if "$ROOT/scripts/verificar-backup.sh" "$work/corrompido" >/dev/null 2>&1; then echo 'ERRO: arquivo corrompido aceito.' >&2; exit 1; fi
if "$ROOT/scripts/restaurar-backup.sh" "$work/corrompido" >/dev/null 2>&1; then echo 'ERRO: restauração corrompida aceita.' >&2; exit 1; fi
compose exec -T api node -e 'fetch("http://127.0.0.1:3000/health").then(r=>{if(!r.ok)process.exit(1)})'
# Change stock after the backup, then restore the older snapshot through the actual command.
compose exec -T api node -e 'if(process.env.SQLITE_PATH!=="/data/backup-qa.sqlite")throw Error("QA only");require("./dist/services/estoque").movimentar({movimento_produto_id:1,movimento_quantidade:5,movimento_tipo:"entrada"},1,"backup-qa-depois-0001")'
"$ROOT/scripts/restaurar-backup.sh" "$original"
compose exec -T api node -e '
 if(process.env.SQLITE_PATH!=="/data/backup-qa.sqlite")throw Error("QA only");const assert=require("node:assert/strict");const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(process.env.SQLITE_PATH);
 assert.equal(db.prepare("SELECT produto_quantidade_estoque AS q FROM pi2_produtos").get().q,2.75);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pi2_movimentos_estoque").get().n,3);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pi2_usuarios").get().n,2);
 assert.equal(db.prepare("SELECT usuario_operar_estoque AS p FROM pi2_usuarios WHERE usuario_nome=?").get("funcionario").p,1);
 assert.equal(db.prepare("SELECT pedido_fluxo AS f FROM pi2_pedidos").get().f,"parcial");
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pi2_entregas_pedido").get().n,2);
 assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pi2_sessoes").get().n,0);db.close();
 const token=require("node:fs").readFileSync("/data/qa-token.txt","utf8");
 (async()=>{assert.equal((await fetch("http://127.0.0.1:3000/v1/sessao",{headers:{Authorization:`Bearer ${token}`}})).status,401);for(const [usuario_login,usuario_password]of [["admin",process.env.ADMIN_PASSWORD],["funcionario","worker-backup-password-2026"]]){const r=await fetch("http://127.0.0.1:3000/v1/usuario/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usuario_login,usuario_password})});assert.equal(r.status,200);}console.log("PASS: restore preserved credentials, employee permissions, balances, orders, receipts, returns and history; old sessions rejected.");})().catch(e=>{console.error(e);process.exitCode=1})'
# Force only the health probe of this disposable project to fail, exercising rollback.
compose exec -T api node -e 'require("./dist/services/estoque").movimentar({movimento_produto_id:1,movimento_quantidade:4,movimento_tipo:"entrada"},1,"backup-qa-rollback-01")'
mkdir "$work/shim"
export REAL_DOCKER="$(command -v docker)"
cat > "$work/shim/docker" <<'SHIM'
#!/usr/bin/env bash
if [[ "${COMPOSE_PROJECT_NAME:-}" == estoque-backup-qa && "$1" == compose && "$*" == *'fetch("http://127.0.0.1:3000/health",'* ]]; then exit 1; fi
exec "$REAL_DOCKER" "$@"
SHIM
chmod +x "$work/shim/docker"
if PATH="$work/shim:$PATH" "$ROOT/scripts/restaurar-backup.sh" "$original"; then echo 'ERRO: falha de saúde não provocou erro.' >&2; exit 1; fi
for attempt in {1..30}; do if compose exec -T api node -e 'fetch("http://127.0.0.1:3000/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))' >/dev/null 2>&1; then break; fi; sleep 1; done
compose exec -T api node -e 'const assert=require("node:assert/strict");const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(process.env.SQLITE_PATH);assert.equal(db.prepare("SELECT produto_quantidade_estoque AS q FROM pi2_produtos").get().q,6.75);assert.equal(db.prepare("SELECT COUNT(*) AS n FROM pi2_movimentos_estoque").get().n,4);db.close();console.log("PASS: health failure rolled back to the previous database and restarted API.");'
# Safety copies must remain valid independently of the restored database.
found=0
for candidate in "$BACKUP_DIR"/estoque-*; do if [[ "$candidate" != "$original" ]]; then found=1; "$ROOT/scripts/verificar-backup.sh" "$candidate"; fi; done
[[ "$found" == 1 ]] || { echo 'Backup anterior não foi criado.' >&2; exit 1; }
echo 'PASS: complete isolated backup/restore workflow, corruption rejection, safety backup and session invalidation.'
