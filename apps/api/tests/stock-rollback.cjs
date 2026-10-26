const assert = require('node:assert/strict');
const pool = require('/app/dist/config/db').default;
const { movimentar } = require('/app/dist/services/estoque');
(async () => {
  const p = (await pool.query("INSERT INTO pi2_produtos (produto_descricao, produto_estado, produto_quantidade_estoque) VALUES ('Rollback', 1, 10) RETURNING *")).rows[0];
  await pool.query("CREATE TRIGGER fail_history BEFORE INSERT ON pi2_movimentos_estoque BEGIN SELECT RAISE(ABORT, 'simulated storage failure'); END");
  assert.throws(() => movimentar({ movimento_produto_id: p.produto_id, movimento_tipo: 'saida', movimento_quantidade: 2 }, 1, require('node:crypto').randomUUID()), /simulated storage failure/);
  assert.equal((await pool.query('SELECT produto_quantidade_estoque FROM pi2_produtos WHERE produto_id = $1', [p.produto_id])).rows[0].produto_quantidade_estoque, 10);
  assert.equal((await pool.query('SELECT * FROM pi2_movimentos_estoque')).rows.length, 0);
  console.log('PASS: failure to save history rolls back stock changes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
