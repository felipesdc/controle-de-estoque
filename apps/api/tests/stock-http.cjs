const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const child = spawn(process.execPath, ['/app/dist/app.js'], { env: { ...process.env, PORT: '3101', SQLITE_PATH: ':memory:' }, stdio: ['ignore', 'ignore', 'inherit'] });
(async () => {
  const base = 'http://127.0.0.1:3101/v1';
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:3101/health')).ok) break; } catch {}
    if (i === 99) throw new Error('Isolated API did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  let token;
  async function request(path, method = 'GET', body, key, jwt = token) {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data };
  }
  token = (await request('/usuario/login', 'POST', { usuario_login: 'admin', usuario_password: process.env.ADMIN_PASSWORD })).data.token;
  assert.ok(token);
  const created = await request('/produto', 'POST', { produto_descricao: 'Produto teste', produto_quantidade_estoque: 10.125, produto_estado: true });
  assert.equal(created.status, 201, JSON.stringify(created));
  const id = created.data.produto_id;
  const saldo = async () => (await request(`/produto/${id}`)).data.produto_quantidade_estoque;
  const historico = async () => (await request('/movimentacao-estoque')).data;
  assert.equal((await historico()).length, 1, 'opening balance is journaled exactly once');
  const body = { movimento_produto_id: id, movimento_tipo: 'saida', movimento_quantidade: 2.125, movimento_observacao: 'Venda', movimento_usuario_id: 999 };
  const key = randomUUID();
  const first = await request('/movimentacao-estoque', 'POST', body, key);
  assert.equal(first.status, 201);
  assert.equal(first.data.movimento_usuario_id, 1, 'actor comes from token');
  assert.equal(await saldo(), 8);
  assert.equal((await request('/movimentacao-estoque', 'POST', body, key)).data.movimento_id, first.data.movimento_id);
  assert.equal(await saldo(), 8, 'retries do not decrement stock twice');
  assert.equal((await request('/movimentacao-estoque', 'POST', { ...body, movimento_quantidade: 3 }, key)).status, 409);
  for (const value of [0, -1, '2', 0.0001]) {
    assert.equal((await request('/movimentacao-estoque', 'POST', { ...body, movimento_quantidade: value }, randomUUID())).status, 400);
  }
  assert.equal((await request('/movimentacao-estoque', 'POST', { ...body, movimento_tipo: 'invalid' }, randomUUID())).status, 400);
  assert.equal((await request('/movimentacao-estoque', 'POST', { ...body, movimento_quantidade: 9 }, randomUUID())).status, 409);
  assert.equal(await saldo(), 8);
  assert.equal((await historico()).length, 2, 'failed operations create no history');
  assert.equal((await request(`/produto/${id}`, 'PUT', { ...created.data, produto_quantidade_estoque: 999 })).status, 409);
  assert.equal((await request(`/movimentacao-estoque/${first.data.movimento_id}`, 'PUT', body)).status, 405);
  assert.equal((await request(`/movimentacao-estoque/${first.data.movimento_id}`, 'DELETE')).status, 405);
  const reversalKey = randomUUID();
  const reversed = await request(`/movimentacao-estoque/${first.data.movimento_id}/estorno`, 'POST', { motivo: 'Venda cancelada' }, reversalKey);
  assert.equal(reversed.status, 201);
  assert.equal(await saldo(), 10.125);
  assert.equal((await request(`/movimentacao-estoque/${first.data.movimento_id}/estorno`, 'POST', { motivo: 'Venda cancelada' }, reversalKey)).status, 201);
  assert.equal(await saldo(), 10.125);
  assert.equal((await request(`/movimentacao-estoque/${first.data.movimento_id}/estorno`, 'POST', { motivo: 'Outro estorno' }, randomUUID())).status, 409);
  assert.equal((await request(`/movimentacao-estoque/${reversed.data.movimento_id}/estorno`, 'POST', { motivo: 'Estorno do estorno' }, randomUUID())).status, 409);
  const concurrent = await Promise.all([1, 2].map(() => request('/movimentacao-estoque', 'POST', { ...body, movimento_quantidade: 7 }, randomUUID())));
  assert.deepEqual(concurrent.map(r => r.status).sort(), [201, 409]);
  assert.equal(await saldo(), 3.125);
  const opening = (await historico()).find(m => m.movimento_observacao === 'Saldo inicial');
  assert.equal((await request(`/movimentacao-estoque/${opening.movimento_id}/estorno`, 'POST', { motivo: 'Sem saldo suficiente' }, randomUUID())).status, 409);
  await request('/perfil', 'POST', { perfil_nome: 'Gerente' });
  const profile = await request('/perfil', 'POST', { perfil_nome: 'Operador' });
  const user = await request('/usuario', 'POST', { usuario_nome: 'operador', usuario_email: 'op@test.local', usuario_password: 'password-test-123', usuario_nome_completo: 'Operador', usuario_perfil_id: profile.data.perfil_id, usuario_status: true, usuario_inscricao: new Date().toISOString() });
  assert.equal(user.status, 201);
  assert.equal(user.data.usuario_password, undefined);
  const opToken = (await request('/usuario/login', 'POST', { usuario_login: 'operador', usuario_password: 'password-test-123' })).data.token;
  assert.ok(opToken);
  assert.equal((await request('/movimentacao-estoque', 'POST', body, randomUUID(), opToken)).status, 403);
  assert.equal((await request('/perfil', 'POST', { perfil_nome: 'Escalation' }, undefined, opToken)).status, 403);
  assert.equal((await request('/produto', 'POST', { produto_descricao: 'Blocked' }, undefined, opToken)).status, 403);
  assert.ok((await request('/usuario', 'GET')).data.every(u => u.usuario_password === undefined));
  assert.equal((await request(`/usuario/${user.data.usuario_id}`, 'PUT', { ...user.data, usuario_nome_completo: 'Operador atualizado', usuario_password: '' })).status, 200);
  assert.ok((await request('/usuario/login', 'POST', { usuario_login: 'operador', usuario_password: 'password-test-123' })).data.token, 'blank password preserves the password');
  assert.equal((await request(`/usuario/${user.data.usuario_id}`, 'DELETE')).status, 204);
  assert.equal((await request(`/usuario/${user.data.usuario_id}`)).data.usuario_status, false, 'inactivation keeps the actor available for audit');
  assert.equal((await request('/movimentacao-estoque', 'GET', undefined, undefined, opToken)).status, 401, 'inactive account cannot reuse an existing token');
  assert.equal((await request(`/produto/${id}`, 'DELETE')).status, 204);
  assert.equal(await saldo(), 3.125, 'inactivation preserves stock');
  assert.equal((await request('/movimentacao-estoque', 'POST', { ...body, movimento_tipo: 'entrada' }, randomUUID())).status, 409);
  console.log('PASS: opening balance, decimal quantities, atomic stock, insufficient balance, concurrent withdrawals, idempotency, immutable history, reversals, authenticated actor, role permissions, hash redaction and inactivation.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => child.kill());
