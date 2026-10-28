const assert = require('node:assert/strict');
const pool = require('/app/dist/config/db').default;
const { getCatalogo, patchProduto } = require('/app/dist/services/catalogo');
const { movimentar } = require('/app/dist/services/estoque');
const now = new Date('2026-10-26T01:30:00Z');
const bad = fn => assert.throws(fn, error => error.status === 400);
(async () => {
  assert.equal(getCatalogo({}, now).total, 0);
  await pool.query("INSERT INTO pi2_categorias (categoria_id,categoria_descricao) VALUES (1,'Alimentos'),(2,'Limpeza')");
  await pool.query("INSERT INTO pi2_unidades (unidade_id,unidade_descricao) VALUES (1,'Pacote')");
  const fixtures = [
    ['Arroz integral',2,'2026-10-25',1,1,'789001'],
    ['Azeite',10,'2026-10-24',1,1,null],
    ['Papel',0,null,1,2,null],
    ['Inativo',3,'2026-10-24',0,2,null],
    ['Limite',5,'2026-11-24',1,null,null],
    ['Produto 100%',12,'2026-02-30',1,null,null],
    ['Produto _ especial',8,null,1,null,null],
    ...Array.from({length:12}, (_, i) => [`Produto extra ${String(i).padStart(2,'0')}`,8,'2026-11-25',1,null,null]),
  ];
  for (const [nome,saldo,data,ativo,categoria,codigo] of fixtures) {
    await pool.query('INSERT INTO pi2_produtos (produto_descricao,produto_quantidade_estoque,produto_data_validade,produto_estado,produto_categoria_id,produto_unidade_id,produto_codigo_barras) VALUES ($1,$2,$3,$4,$5,1,$6)',[nome,saldo,data,ativo,categoria,codigo]);
  }
  const first = getCatalogo({}, now);
  assert.equal(first.total,18); assert.equal(first.itens.length,10); assert.equal(first.paginas,2);
  assert.equal(first.itens[0].produto_descricao,'Arroz integral');
  assert.equal(first.itens[0].produto_categoria,'Alimentos'); assert.equal(first.itens[0].produto_unidade,'Pacote');
  assert.equal(first.criterios.data_referencia,'2026-10-25');
  assert.equal(getCatalogo({pagina:'999'},now).pagina,2);
  assert.equal(getCatalogo({pagina:'2'},now).itens.length,8);
  assert.equal(getCatalogo({estado:'inativos'},now).total,1);
  assert.equal(getCatalogo({estado:'todos'},now).total,19);
  assert.equal(getCatalogo({estoque:'baixo'},now).total,2);
  assert.equal(getCatalogo({estoque:'zerado'},now).total,1);
  assert.equal(getCatalogo({vencimento:'vencido'},now).total,1);
  assert.equal(getCatalogo({vencimento:'em_breve'},now).total,2);
  assert.equal(getCatalogo({vencimento:'sem_validade'},now).total,3);
  assert.equal(getCatalogo({q:'arroz',categoria:'1',estoque:'baixo',vencimento:'em_breve'},now).total,1);
  assert.equal(getCatalogo({q:'789001'},now).total,1);
  assert.equal(getCatalogo({q:'1'},now).itens.some(p => p.produto_id===1),true);
  assert.equal(getCatalogo({q:'%'},now).total,1, 'percent is literal');
  assert.equal(getCatalogo({q:'_'},now).total,1, 'underscore is literal');
  assert.equal(getCatalogo({q:"' OR 1=1 --"},now).total,0);
  assert.equal(getCatalogo({ordem:'saldo'},now).itens[0].produto_quantidade_estoque,0);
  assert.equal(getCatalogo({ordem:'recentes',direcao:'desc'},now).itens[0].produto_id,19);
  for (const params of [{pagina:'0'},{pagina:['1']},{tamanho:'100000'},{categoria:'-1'},{estado:'bad'},{ordem:'1; DROP TABLE pi2_produtos'},{direcao:'bad'}]) bad(()=>getCatalogo(params,now));
  movimentar({movimento_produto_id:1,movimento_quantidade:3,movimento_tipo:'entrada'},1,require('node:crypto').randomUUID());
  const edited = patchProduto(1,{produto_descricao:'  Arroz atualizado  ',produto_codigo_barras:'ABC',produto_data_validade:'2028-02-29'});
  assert.equal(edited.produto_quantidade_estoque,5,'metadata patch preserves the current balance after a movement');
  assert.equal(edited.produto_descricao,'Arroz atualizado');
  assert.equal((await pool.query('SELECT * FROM pi2_movimentos_estoque')).rows.length,1);
  for (const body of [{produto_quantidade_estoque:999},{produto_id:2},{produto_descricao:'  '},{produto_estado:'false'},{produto_categoria_id:999},{produto_unidade_id:0},{produto_data_validade:'2026-02-30'},{produto_codigo_barras:'x'.repeat(81)},{}]) bad(()=>patchProduto(1,body));
  assert.throws(()=>patchProduto(999,{produto_descricao:'Missing'}), e=>e.status===404);
  patchProduto(1,{produto_estado:false});
  assert.equal(getCatalogo({estado:'inativos'},now).total,2);
  assert.equal(patchProduto(1,{produto_estado:true}).produto_quantidade_estoque,5);
  console.log('PASS: server pagination, filters, sorting, search literals, invalid query rejection, date boundaries, relation labels, validation, activation and metadata edits preserving concurrent stock.');
})().catch(error=>{console.error(error);process.exitCode=1;});
