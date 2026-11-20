const assert=require('node:assert/strict');const pool=require('/app/dist/config/db').default;const {opcoesCadastro}=require('/app/dist/services/cadastros');
(async()=>{
 for(let i=1;i<=63;i++)await pool.query('INSERT INTO pi2_categorias(categoria_descricao) VALUES($1)',['Categoria '+String(i).padStart(3,'0')]);
 await pool.query('INSERT INTO pi2_categorias(categoria_descricao) VALUES($1)',['Literal %_']);
 const first=opcoesCadastro('categorias',{});assert.equal(first.itens.length,25);assert.equal(first.total,64);assert.equal(first.selecionado,null);
 const second=opcoesCadastro('categorias',{pagina:'2',selecionado:'63'});assert.equal(second.selecionado.id,63);assert.ok(!second.itens.some(i=>i.id===63));assert.deepEqual(Object.keys(second.selecionado).sort(),['id','nome']);assert.ok(!second.itens.some(i=>first.itens.some(f=>f.id===i.id)));
 const last=opcoesCadastro('categorias',{pagina:'999'});assert.equal(last.pagina,3);assert.equal(last.itens.length,14);
 const literal=opcoesCadastro('categorias',{q:'%_'});assert.equal(literal.total,1);assert.equal(literal.itens[0].nome,'Literal %_');
 assert.equal(opcoesCadastro('categorias',{selecionado:'99999'}).selecionado,null);
 for(const params of [{q:[]},{q:'x'.repeat(101)},{pagina:0},{pagina:'1.1'},{pagina:'9007199254740992'},{selecionado:'abc'},{extra:'x'}])assert.throws(()=>opcoesCadastro('categorias',params),e=>e.status===400);
 await pool.query("INSERT INTO pi2_fornecedores(fornecedor_nome,fornecedor_contato,fornecedor_endereco) VALUES('Teste','Contato privado','Endereço privado')");
 assert.deepEqual(opcoesCadastro('fornecedores',{}).itens,[{id:1,nome:'Teste'}]);
 console.log('PASS: bounded 25-item options, stable disjoint pages, literal search, independent selected hydration, missing selection, filter validation and minimal DTO.');
})().catch(e=>{console.error(e);process.exitCode=1});
