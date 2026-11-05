const assert = require('node:assert/strict');
const pool = require('/app/dist/config/db').default;
const {getCatalogo, patchProduto} = require('/app/dist/services/catalogo');
const {getDashboard} = require('/app/dist/services/dashboard');
const {getRelatorioEstoque} = require('/app/dist/services/catalogo');
const {estoqueCsv} = require('/app/dist/services/relatorios');
const {createProduto} = require('/app/dist/models/produto');
(async () => {
 const make = (nome,minimo) => createProduto(nome,null,null,null,null,0,null,null,true,1,undefined,minimo);
 const a = await make('Mínimo fracionário',1.125);
 const b = await make('Sem alerta',0);
 const c = await make('Padrão',undefined);
 assert.equal(c.produto_estoque_minimo,5);
 assert.equal(b.produto_estoque_minimo,0);
 await pool.query('UPDATE pi2_produtos SET produto_quantidade_estoque=$2 WHERE produto_id=$1',[a.produto_id,1.124]);
 assert.equal(getCatalogo({estoque:'baixo'}).total,2);
 assert.equal(getDashboard().totais.estoque_baixo,2);
 assert.equal(getRelatorioEstoque({}).resumo.baixos,2);
 assert.ok(estoqueCsv(getRelatorioEstoque({},new Date(),true)).includes('"1,125"'));
 patchProduto(a.produto_id,{produto_estoque_minimo:1.124});
 assert.equal(getCatalogo({estoque:'baixo'}).total,1,'equal minimum is not low');
 assert.equal(getDashboard().totais.estoque_baixo,1);
 assert.equal(getRelatorioEstoque({}).resumo.baixos,1);
 assert.equal(getCatalogo({q:'Mínimo'}).itens[0].produto_quantidade_estoque,1.124,'editing minimum preserves balance');
 for(const bad of [-1,1.0001,1e9+1,null,'5',true,NaN,Infinity]) {
  assert.throws(()=>patchProduto(a.produto_id,{produto_estoque_minimo:bad}),e=>e.status===400);
  await assert.rejects(()=>make('Inválido',bad),e=>e.status===400);
 }
 patchProduto(c.produto_id,{produto_estado:false});
 assert.equal(getDashboard().totais.estoque_baixo,0,'inactive excluded');
 assert.equal(getCatalogo({estado:'todos',estoque:'baixo'}).total,1);
 console.log('PASS: creation, default, fractions, zero, equality, validation, unchanged balance and consistent dashboard/report/catalog/CSV.');
})().catch(e=>{console.error(e);process.exitCode=1});
