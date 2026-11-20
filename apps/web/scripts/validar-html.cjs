const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../dist/controle-de-estoque-pi-2/browser');
const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
assert.ok(scripts.length > 0, 'A aplicação precisa de scripts externos.');
for (const [, attrs, body] of scripts) {
  const source = attrs.match(/\bsrc="([^"]+)"/i)?.[1];
  assert.ok(source && /^[\w.-]+\.js$/.test(source), 'Use apenas scripts externos do próprio build.');
  assert.equal(body.trim(), '', 'Script inline seria bloqueado pela CSP.');
  assert.ok(fs.statSync(path.join(dir, source)).isFile());
}
assert.ok(!/\bon(?:load|error)\s*=/i.test(html), 'Handlers inline seriam bloqueados pela CSP.');
console.log('PASS: HTML compilado compatível com script-src self, sem scripts/handlers inline.');
