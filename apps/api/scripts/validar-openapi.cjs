const assert = require('node:assert/strict');
const path = require('node:path');
const SwaggerParser = require('@apidevtools/swagger-parser');
(async () => {
 const api = await SwaggerParser.validate(path.join(__dirname,'../src/swagger.json'));
 assert.deepEqual(api.servers,[{url:'/v1',description:'API da mesma instalação'}]);
 assert.ok(api.components.securitySchemes.bearerAuth);
 for (const route of ['/inventarios','/inventarios/{id}/aprovar','/usuario/login','/sessao','/dashboard','/catalogo/produtos','/catalogo/produtos/codigo','/compras/reposicao','/compras/pedidos','/relatorios/estoque','/relatorios/estoque.csv','/acessos/usuarios','/cadastros/{tipo}']) assert.ok(api.paths[route],route);
 assert.deepEqual(api.paths['/usuario/login'].post.security,[]);
 assert.ok(api.paths['/pedido'].post.responses['405']);
 assert.ok(!api.paths['/pedido'].post.responses['201']);
 assert.ok(api.paths['/movimentacao-estoque/{movimento_id}'].delete.responses['405']);
 const post=api.paths['/movimentacao-estoque'].post;
 assert.ok(post.parameters.some(p=>p.in==='header'&&p.name==='Idempotency-Key'&&p.required));
 assert.ok(api.paths['/relatorios/estoque.csv'].get.responses['200'].content['text/csv']);
 assert.ok(api.paths['/inventarios/{id}/aprovar'].post.parameters.some(p=>p.in==='header'&&p.name==='Idempotency-Key'&&p.required));
 assert.equal(api.components.schemas.MovimentoInput.properties.movimento_codigo_lido.type,'string');
 console.log(`PASS: OpenAPI válido, ${Object.keys(api.paths).length} caminhos; autenticação, idempotência, CSV e bloqueios legados conferidos.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
