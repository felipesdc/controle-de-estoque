const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const child = spawn(process.execPath, ['/app/dist/app.js'], { env: { ...process.env, PORT: '3102', SQLITE_PATH: ':memory:' }, stdio: ['ignore', 'ignore', 'inherit'] });
(async () => {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:3102/health')).ok) break; } catch {}
    if (i === 99) throw new Error('Isolated API did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const url = 'http://127.0.0.1:3102/v1/dashboard';
  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: { Authorization: 'Bearer invalid' } })).status, 401);
  const login = await fetch('http://127.0.0.1:3102/v1/usuario/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario_login: 'admin', usuario_password: process.env.ADMIN_PASSWORD }) });
  const { token } = await login.json();
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.totais.produtos_ativos, 0);
  assert.equal(data.criterios.fuso, 'America/Sao_Paulo');
  assert.equal(data.movimentos_recentes.length, 0);
  console.log('PASS: dashboard endpoint requires authentication and returns the documented contract.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => child.kill());
