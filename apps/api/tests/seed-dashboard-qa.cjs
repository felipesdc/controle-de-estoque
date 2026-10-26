const assert = require('node:assert/strict');
if (process.env.SQLITE_PATH !== '/data/dashboard-qa.sqlite' || process.env.ADMIN_EMAIL !== 'qa@dashboard.local') {
  throw new Error('This fixture only runs inside the disposable dashboard QA environment.');
}
(async () => {
  const base = 'http://127.0.0.1:3000/v1';
  const login = await fetch(base + '/usuario/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_login: 'admin', usuario_password: process.env.ADMIN_PASSWORD }) });
  const { token } = await login.json();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const current = await fetch(base + '/produto', { headers });
  assert.equal((await current.json()).length, 0, 'fixture must start with an empty QA database');
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const date = type => parts.find(p => p.type === type).value;
  const today = `${date('year')}-${date('month')}-${date('day')}`;
  const plus = days => { const d = new Date(today + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
  const samples = [
    ['Arroz integral · pacote 5 kg', 3, plus(18)],
    ['Azeite de oliva · 500 ml', 10, plus(-3)],
    ['Papel toalha · pacote', 0, null],
    ['Farinha de trigo · 1 kg', 21, plus(60)],
    ['Molho de tomate · 300 g', 6, today],
  ];
  const ids = [];
  for (const [produto_descricao, produto_quantidade_estoque, produto_data_validade] of samples) {
    const response = await fetch(base + '/produto', { method: 'POST', headers, body: JSON.stringify({ produto_descricao, produto_quantidade_estoque, produto_data_validade, produto_estado: true }) });
    assert.equal(response.status, 201);
    ids.push((await response.json()).produto_id);
  }
  for (const [id, tipo, valor] of [[ids[0], 'saida', 1], [ids[3], 'entrada', 5]]) {
    const response = await fetch(base + '/movimentacao-estoque', { method: 'POST', headers: { ...headers, 'Idempotency-Key': require('node:crypto').randomUUID() }, body: JSON.stringify({ movimento_produto_id: id, movimento_tipo: tipo, movimento_quantidade: valor, movimento_observacao: 'Dados exclusivos de validação visual' }) });
    assert.equal(response.status, 201);
  }
  const dashboard = await (await fetch(base + '/dashboard', { headers })).json();
  assert.deepEqual(dashboard.totais, { produtos_ativos: 5, estoque_baixo: 2, vencem_em_breve: 2, vencidos: 1 });
  assert.equal(dashboard.movimentos_recentes.length, 6);
  console.log('PASS: populated QA dashboard matches 5 active products, 2 low-stock, 2 expiring, 1 expired and 6 movements.');
})().catch(error => { console.error(error); process.exitCode = 1; });
