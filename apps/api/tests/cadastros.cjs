const assert=require('node:assert/strict');
const pool=require('/app/dist/config/db').default;
const {listarCadastro,lerCadastro,salvarCadastro,excluirCadastro,tipoCadastro}=require('/app/dist/services/cadastros');
const status=(fn,code)=>assert.throws(fn,e=>e.status===code);
(async()=>{
  for(const tipo of ['categorias','unidades','fornecedores']){
    assert.equal(listarCadastro(tipo,{}).total,0);
    status(()=>salvarCadastro(tipo,{nome:'  '}),400);
    status(()=>salvarCadastro(tipo,{nome:123}),400);
    status(()=>salvarCadastro(tipo,{nome:'Nome',sql:'DROP'}),400);
    status(()=>salvarCadastro(tipo,{nome:'Nome',constructor:'campo inválido'}),400);
    const row=salvarCadastro(tipo,{nome:'  Água   mineral  ',...(tipo==='fornecedores'?{contato:' teste@local ',endereco:' Rua de teste '}: {})});
    assert.equal(row.nome,'Água mineral');assert.equal(row.total_vinculos,0);
    status(()=>salvarCadastro(tipo,{nome:'ÁGUA mineral'}),409);
    const edited=salvarCadastro(tipo,{nome:'Novo nome'},row.id);
    assert.equal(edited.id,row.id);assert.equal(edited.nome,'Novo nome');
    if(tipo==='fornecedores'){
      assert.equal(edited.contato,'teste@local');assert.equal(edited.endereco,'Rua de teste');
      status(()=>salvarCadastro(tipo,{contato:123},row.id),400);
      status(()=>salvarCadastro(tipo,{endereco:'x'.repeat(501)},row.id),400);
      assert.equal(salvarCadastro(tipo,{contato:null},row.id).contato,'');
    }
    excluirCadastro(tipo,row.id);
    status(()=>lerCadastro(tipo,row.id),404);
    status(()=>excluirCadastro(tipo,99999),404);
    status(()=>lerCadastro(tipo,'1e0'),400);
  }
  status(()=>tipoCadastro('__proto__'),404);
  const c=salvarCadastro('categorias',{nome:'Alimentos'});
  const u=salvarCadastro('unidades',{nome:'Unidade'});
  const f=salvarCadastro('fornecedores',{nome:'Fornecedor'});
  await pool.query('INSERT INTO pi2_produtos (produto_descricao,produto_quantidade_estoque,produto_estado,produto_categoria_id,produto_unidade_id,produto_fornecedor_id) VALUES ($1,2,0,$2,$3,$4)',['Produto inativo',c.id,u.id,f.id]);
  await pool.query('INSERT INTO pi2_itens_pedido (item_pedido_unidade_id) VALUES ($1)',[u.id]);
  await pool.query('INSERT INTO pi2_pedidos (pedido_fornecedor_id) VALUES ($1)',[f.id]);
  assert.equal(lerCadastro('categorias',c.id).produtos,1);
  assert.equal(lerCadastro('unidades',u.id).total_vinculos,2);
  assert.equal(lerCadastro('fornecedores',f.id).pedidos,1);
  for(const [tipo,id] of [['categorias',c.id],['unidades',u.id],['fornecedores',f.id]])status(()=>excluirCadastro(tipo,id),409);
  salvarCadastro('categorias',{nome:'Grupo atualizado'},c.id);
  assert.equal((await pool.query('SELECT produto_categoria_id FROM pi2_produtos')).rows[0].produto_categoria_id,c.id);
  assert.equal((await pool.query('SELECT produto_quantidade_estoque FROM pi2_produtos')).rows[0].produto_quantidade_estoque,2);
  for(let i=0;i<15;i++)salvarCadastro('categorias',{nome:`Grupo ${String(i).padStart(2,'0')}`});
  assert.equal(listarCadastro('categorias',{}).total,16);
  assert.equal(listarCadastro('categorias',{pagina:'2'}).itens.length,6);
  assert.equal(listarCadastro('categorias',{pagina:'999'}).pagina,2);
  salvarCadastro('categorias',{nome:'Percentual 100%'});
  salvarCadastro('categorias',{nome:'Especial _ literal'});
  assert.equal(listarCadastro('categorias',{q:'%'}).total,1);
  assert.equal(listarCadastro('categorias',{q:'_'}).total,1);
  assert.equal(listarCadastro('categorias',{q:"' OR 1=1 --"}).total,0);
  status(()=>listarCadastro('categorias',{pagina:'0'}),400);
  status(()=>listarCadastro('categorias',{q:['a']}),400);
  status(()=>listarCadastro('categorias',{tamanho:'1000'}),400);
  const legacy=salvarCadastro('categorias',{categoria_descricao:'Legado'},undefined,true);
  assert.ok(legacy.categoria_id);
  assert.equal(salvarCadastro('categorias',{categoria_id:legacy.categoria_id,categoria_descricao:'Legado atualizado'},legacy.categoria_id,true).categoria_descricao,'Legado atualizado');
  console.log('PASS: normalized unique names, partial edits, optional supplier fields, validation, reference counts, inactive/historical protection, safe deletion, pagination, search literals and legacy contracts.');
})().catch(e=>{console.error(e);process.exitCode=1;});
