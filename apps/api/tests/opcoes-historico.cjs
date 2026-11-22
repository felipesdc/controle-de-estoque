const assert=require('node:assert/strict'),pool=require('/app/dist/config/db').default,{opcoesHistorico}=require('/app/dist/services/opcoes-historico');
(async()=>{
 for(let i=0;i<60;i++)await pool.query('INSERT INTO pi2_produtos(produto_descricao,produto_estado,produto_quantidade_estoque) VALUES($1,$2,0)',['Produto '+String(i).padStart(3,'0'),i===59?0:1]);
 const r=opcoesHistorico({},'produtos');assert.equal(r.total,60);assert.equal(r.itens.length,25);assert.equal(opcoesHistorico({q:'000',selecionado:'60'},'produtos').selecionado.nome,'Produto 059 (inativo)');assert.equal(opcoesHistorico({q:'%'},'produtos').total,0);
 await pool.query("INSERT INTO pi2_usuarios(usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status) VALUES('Sem histórico','privado@qa.local','hash',3,1)");
 assert.equal(opcoesHistorico({},'responsaveis').total,0);
 await pool.query("INSERT INTO pi2_movimentos_estoque(movimento_produto_id,movimento_quantidade,movimento_tipo,movimento_data,movimento_usuario_id) VALUES(1,1,'entrada','2026-11-22',1)");
 const responsaveis=opcoesHistorico({},'responsaveis');assert.equal(responsaveis.total,1);assert.deepEqual(Object.keys(responsaveis.itens[0]).sort(),['id','nome']);assert.equal(responsaveis.itens[0].id,1);assert.equal(opcoesHistorico({selecionado:'2'},'responsaveis').selecionado,null);
 for(const q of [{q:[]},{q:'a'.repeat(101)},{pagina:'0'},{selecionado:'1e2'}])assert.throws(()=>opcoesHistorico(q,'produtos'),e=>e.status===400);
 console.log('PASS: bounded historical options include inactive products, preserve selected IDs outside filters, restrict responsible users to movement history and disclose no contacts/credentials.');
})().catch(e=>{console.error(e);process.exitCode=1});
