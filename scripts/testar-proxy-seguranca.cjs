// Execute only inside the disposable dashboard QA API container.
const assert = require('node:assert/strict');
if (process.env.SQLITE_PATH !== '/data/dashboard-qa.sqlite' || process.env.ADMIN_EMAIL !== 'qa@dashboard.local') throw Error('Teste restrito à base descartável de QA.');
(async () => {
  const base = 'http://web';
  for (const path of ['/', '/login', '/recuperar-senha', '/redefinir-senha', '/home/seguranca']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(response.headers.get('content-security-policy').includes("script-src 'self'"));
  }
  assert.equal((await fetch(base + '/health')).status, 200);
  assert.equal((await fetch(base + '/v1/seguranca')).status, 401);
  assert.equal((await (await fetch(base + '/v1/auth/configuracao')).json()).recuperacao_email, false);
  // A forged forwarding header must not create a fresh IP budget on each request.
  for (let attempt = 0; attempt < 31; attempt++) {
    const response = await fetch(base + '/v1/auth/mfa', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'X-Forwarded-For': `198.51.100.${attempt + 1}`},
      body: JSON.stringify({desafio: 'invalid', codigo: '000000'}),
    });
    assert.equal(response.status, attempt < 30 ? 401 : 429);
    if (attempt === 30) assert.ok(Number(response.headers.get('retry-after')) > 0);
  }
  await require('/app/dist/config/db').default.query('DELETE FROM pi2_auth_limites'); // QA-only cleanup: leave the demo usable.
  console.log('PASS: SPA security routes, CSP/headers, health, private endpoint, disabled SMTP and forwarding-header spoof resistance through Nginx.');
})().catch(error => { console.error(error); process.exitCode = 1; });
