const assert = require('node:assert/strict');
const { test } = require('node:test');
const pool = require('/app/dist/config/db').default;

test('SQLite preserves numbered bindings, RETURNING and boolean JSON contracts', async () => {
  const profile = (await pool.query('INSERT INTO pi2_perfis (perfil_nome) VALUES ($1) RETURNING *', ['Operador'])).rows[0];
  const updated = (await pool.query('UPDATE pi2_perfis SET perfil_nome = $2 WHERE perfil_id = $1 RETURNING *', [profile.perfil_id, 'Compras'])).rows[0];
  assert.equal(updated.perfil_nome, 'Compras');
  assert.equal(updated.perfil_id, profile.perfil_id);
  const admin = (await pool.query('SELECT * FROM pi2_usuarios WHERE usuario_nome = $1', ['admin'])).rows[0];
  assert.equal(admin.usuario_status, true);
  const missing = await pool.query('SELECT * FROM pi2_perfis WHERE perfil_nome = $1', ["' OR 1=1 --"]);
  assert.deepEqual(missing.rows, []);
});

test('Foreign keys reject orphaned movements and preserve existing data', async () => {
  await assert.rejects(pool.query('INSERT INTO pi2_movimentos_estoque (movimento_produto_id) VALUES ($1)', [999999]), /FOREIGN KEY/);
  assert.deepEqual((await pool.query('SELECT * FROM pi2_movimentos_estoque')).rows, []);
  assert.equal((await pool.query('SELECT * FROM pi2_usuarios')).rows.length, 1);
});
