const assert = require('node:assert/strict');
const pool = require('/app/dist/config/db').default;
const { getDashboard } = require('/app/dist/services/dashboard');
const now = new Date('2026-10-26T01:30:00.000Z'); // Still October 25 in São Paulo.
(async () => {
  const empty = getDashboard(now);
  assert.deepEqual(empty.totais, { produtos_ativos: 0, estoque_baixo: 0, vencem_em_breve: 0, vencidos: 0 });
  assert.deepEqual(empty.baixo_estoque, []);
  assert.deepEqual(empty.vencimentos, []);
  assert.deepEqual(empty.movimentos_recentes, []);
  assert.equal(empty.criterios.data_referencia, '2026-10-25');
  assert.equal(empty.criterios.vencimento_ate, '2026-11-24');
  assert.equal(getDashboard(new Date('2027-01-01T02:00:00Z')).criterios.data_referencia, '2026-12-31');
  const fixtures = [
    ['Sem saldo', 0, null, 1],
    ['Vence hoje', 4.999, '2026-10-25', 1],
    ['Limite de 30 dias', 5, '2026-11-24', 1],
    ['Vencido', 10, '2026-10-24', 1],
    ['Depois do limite', 8, '2026-11-25', 1],
    ['Inativo não alerta', 1, '2026-10-24', 0],
    ['Vencido sem saldo', 0, '2026-10-24', 1],
    ['Data impossível', 10, '2026-02-30', 1],
    ['Data ausente', 10, '', 1],
    ['Data ISO', 5, '2026-10-25T00:00:00.000Z', 1],
    ['Data inválida', 10, 'not-a-date', 1],
  ];
  const ids = [];
  for (const fixture of fixtures) {
    ids.push((await pool.query('INSERT INTO pi2_produtos (produto_descricao, produto_quantidade_estoque, produto_data_validade, produto_estado) VALUES ($1,$2,$3,$4) RETURNING *', fixture)).rows[0].produto_id);
  }
  const d = getDashboard(now);
  assert.deepEqual(d.totais, { produtos_ativos: 10, estoque_baixo: 3, vencem_em_breve: 3, vencidos: 1 });
  assert.deepEqual(d.baixo_estoque.map(p => p.quantidade), [0, 0, 4.999]);
  assert.equal(d.vencimentos.length, 4);
  assert.equal(d.vencimentos[0].situacao, 'vencido');
  assert.equal(d.vencimentos.filter(p => p.situacao === 'hoje').length, 2);
  for (let i = 0; i < 10; i++) {
    await pool.query('INSERT INTO pi2_produtos (produto_descricao, produto_quantidade_estoque, produto_data_validade, produto_estado) VALUES ($1,1,$2,1)', [`Mais ${i}`, '2026-10-24']);
  }
  await pool.query("INSERT INTO pi2_movimentos_estoque (movimento_produto_id, movimento_tipo, movimento_quantidade, movimento_data) VALUES ($1,'entrada',1,'invalid-legacy-date')", [ids[0]]);
  assert.equal(getDashboard(now).movimentos_recentes[0].movimento_data, null, 'invalid legacy dates do not reach the date pipe');
  for (let i = 0; i < 14; i++) {
    await pool.query('INSERT INTO pi2_movimentos_estoque (movimento_produto_id, movimento_tipo, movimento_quantidade, movimento_data, movimento_usuario_id) VALUES ($1,$2,1,$3,1)', [ids[0], i % 2 ? 'saida' : 'entrada', `2026-10-25T12:${String(i).padStart(2, '0')}:00Z`]);
  }
  const limited = getDashboard(now);
  assert.equal(limited.totais.estoque_baixo, 13, 'totals are not limited by preview lists');
  assert.equal(limited.baixo_estoque.length, 6);
  assert.equal(limited.vencimentos.length, 6);
  assert.equal(limited.movimentos_recentes.length, 10);
  assert.equal(limited.movimentos_recentes[0].movimento_id, 15);
  assert.equal(limited.movimentos_recentes[0].responsavel, 'admin');
  assert.equal(limited.movimentos_recentes[0].produto, 'Sem saldo');
  console.log('PASS: empty dashboard, São Paulo date boundaries, expiry limits, invalid dates, inactive/zero-stock exclusions, fractional stock, exact totals, bounded lists and latest movements.');
})().catch(error => { console.error(error); process.exitCode = 1; });
