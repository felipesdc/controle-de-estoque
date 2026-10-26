const assert = require('node:assert/strict');
(async () => {
  const { id, token } = JSON.parse(require('node:fs').readFileSync('/tmp/estoque-http-test.json', 'utf8'));
  const headers = { Authorization: `Bearer ${token}` };
  const url = `http://web/v1/categoria/${id}`;
  const found = await fetch(url, { headers });
  assert.equal(found.status, 200);
  assert.equal((await found.json()).categoria_descricao, 'Teste de persistência Docker');
  assert.equal((await fetch(url, { method: 'DELETE', headers })).status, 204);
  require('node:fs').unlinkSync('/tmp/estoque-http-test.json');
  console.log('Persistence after API restart passed; test category removed');
})().catch(error => { console.error(error); process.exit(1); });
