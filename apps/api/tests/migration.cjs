const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const dir = mkdtempSync('/tmp/estoque-migration-');
process.env.SQLITE_PATH = `${dir}/legacy.sqlite`;
const legacy = new DatabaseSync(process.env.SQLITE_PATH);
legacy.exec(require('/app/dist/config/schema').schema);
legacy.exec(`INSERT INTO pi2_produtos (produto_id, produto_descricao, produto_quantidade_estoque, produto_estado) VALUES (1, 'Produto anterior', 15, 1);
INSERT INTO pi2_movimentos_estoque (movimento_produto_id, movimento_quantidade, movimento_tipo) VALUES (1, 5, 'entrada'); PRAGMA user_version = 1;`);
legacy.close();
(async () => {
  const pool = require('/app/dist/config/db').default;
  assert.equal((await pool.query('SELECT * FROM pi2_produtos')).rows[0].produto_quantidade_estoque, 15);
  const movement = (await pool.query('SELECT * FROM pi2_movimentos_estoque')).rows[0];
  assert.equal(movement.movimento_quantidade, 5);
  assert.equal(movement.movimento_saldo_anterior, null, 'legacy history is not reapplied to stock');
  console.log('PASS: v1 → v2 preserves existing balances and legacy history.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => rmSync(dir, { recursive: true, force: true }));
