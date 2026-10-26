const assert = require('node:assert/strict');
(async () => {
  const base = 'http://web';
  assert.equal((await fetch(base + '/')).status, 200);
  assert.equal((await fetch(base + '/home/produtos')).status, 200);
  assert.equal((await fetch(base + '/health')).status, 200);
  assert.equal((await fetch(base + '/v1/categoria')).status, 401);
  const login = async password => fetch(base + '/v1/usuario/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_login: 'admin', usuario_password: password }),
  });
  const bad = await login('incorrect-password');
  assert.equal(bad.status, 401);
  assert.equal((await bad.json()).token, undefined);
  const good = await login(process.env.ADMIN_PASSWORD);
  assert.equal(good.status, 200);
  const { token } = await good.json();
  assert.ok(token);
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const created = await fetch(base + '/v1/categoria', {
    method: 'POST', headers, body: JSON.stringify({ categoria_descricao: 'Teste de persistência Docker' }),
  });
  assert.equal(created.status, 201);
  const category = await created.json();
  require('node:fs').writeFileSync('/tmp/estoque-http-test.json', JSON.stringify({ id: category.categoria_id, token }));
  const list = await fetch(base + '/v1/categoria', { headers });
  assert.ok((await list.json()).some(row => row.categoria_id === category.categoria_id));
  console.log('HTTP: frontend, deep link, health, authentication and CRUD passed');
})().catch(error => { console.error(error); process.exit(1); });
