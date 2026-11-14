const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const pool=require('/app/dist/config/db').default;
const {criarInventario,salvarContagem,acaoInventario,obterInventario,listarInventarios}=require('/app/dist/services/inventarios');
const {movimentar,estornar}=require('/app/dist/services/estoque');
const {listarHistorico}=require('/app/dist/services/historico');
const bad=(status,fn)=>assert.throws(fn,e=>e.status===status);
(async()=>{
 await pool.query("INSERT INTO pi2_unidades(unidade_id,unidade_descricao) VALUES(1,'kg'),(2,'Pacote')");
 await pool.query("INSERT INTO pi2_produtos(produto_id,produto_descricao,produto_quantidade_estoque,produto_estado,produto_unidade_id) VALUES(1,'Café',10.125,1,1),(2,'Papel',4,1,2),(3,'Sem diferença',0,1,1),(4,'Inativo',2,0,1)");
 const newCount=()=>criarInventario({titulo:'Contagem teste',produtos:[1,2,3]},1,randomUUID());
 const save=(d,counts)=>salvarContagem(d.inventario_id,{versao:d.versao,itens:counts.map(([produto,quantidade])=>({produto,quantidade}))},1);
 const action=(d,act,motivo='Conferência física',key=randomUUID())=>acaoInventario(d.inventario_id,act,{versao:d.versao,...(act==='revisar'?{}:{motivo})},1,key);
 const balance=async(id)=>(await pool.query('SELECT produto_quantidade_estoque AS q FROM pi2_produtos WHERE produto_id=$1',[id])).rows[0].q;
 const count=async(table)=>(await pool.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n;
 const creationKey=randomUUID(),body={titulo:'Primeira',produtos:[3,1,2]};
 let d=criarInventario(body,1,creationKey);assert.equal(d.estado,'aberto');assert.equal(d.itens.find(i=>i.produto_id===1).saldo,10.125);
 assert.equal(criarInventario({...body,produtos:[1,2,3]},1,creationKey).inventario_id,d.inventario_id);
 bad(409,()=>criarInventario({...body,titulo:'Outra'},1,creationKey));
 const before=await count('pi2_inventarios');
 bad(409,()=>criarInventario({titulo:'Inválido',produtos:[1,4]},1,randomUUID()));assert.equal(await count('pi2_inventarios'),before,'failed creation rolled back');
 for(const invalid of [[],[1,1],Array(101).fill(1),['1']])bad(400,()=>criarInventario({titulo:'Inválido',produtos:invalid},1,randomUUID()));
 bad(409,()=>action(d,'revisar'));bad(409,()=>action(d,'aprovar'));
 d=save(d,[[1,8],[2,5.25]]);assert.equal(await balance(1),10.125);assert.equal(await count('pi2_movimentos_estoque'),0);
 bad(409,()=>action(d,'revisar')); // uncounted differs from zero
 const oldVersion=d.versao;d=save(d,[[3,0]]);bad(409,()=>salvarContagem(d.inventario_id,{versao:oldVersion,itens:[{produto:3,quantidade:1}]},1));
 for(const v of [-1,1.0001,1e9+1,'1',NaN,Infinity])bad(400,()=>save(d,[[1,v]]));
 bad(400,()=>save(d,[[1,1],[1,2]]));
 const events=d.eventos.length;
 bad(400,()=>save(d,[[1,1],[4,1]]));assert.equal(obterInventario(d.inventario_id).itens.find(i=>i.produto_id===1).contado,8,'all count edits rolled back');assert.equal(obterInventario(d.inventario_id).eventos.length,events);
 d=action(d,'revisar');assert.equal(d.estado,'revisao');bad(409,()=>save(d,[[1,3]]));
 const approvalVersion=d.versao,approvalKey=randomUUID();
 d=action(d,'aprovar','Diferenças conferidas',approvalKey);assert.equal(d.estado,'aprovado');assert.equal(await balance(1),8);assert.equal(await balance(2),5.25);assert.equal(await count('pi2_movimentos_estoque'),2);
 const retry=acaoInventario(d.inventario_id,'aprovar',{versao:approvalVersion,motivo:'Diferenças conferidas'},1,approvalKey);assert.equal(retry.versao,d.versao);assert.equal(await count('pi2_movimentos_estoque'),2);
 bad(409,()=>acaoInventario(d.inventario_id,'aprovar',{versao:approvalVersion,motivo:'Outro motivo'},1,approvalKey));
 bad(409,()=>action(d,'aprovar'));bad(409,()=>action(d,'cancelar'));bad(409,()=>action(d,'recontar'));bad(409,()=>save(d,[[1,9]]));
 const movement=d.itens.find(i=>i.produto_id===1).movimento_id;bad(409,()=>estornar(movement,'Correção isolada',1,randomUUID()));
 assert.equal(listarHistorico({q:String(movement)}).itens.find(i=>i.movimento_id===movement).movimento_inventario_id,d.inventario_id);
 // Approval must notice intervening movements even when the final balance is identical.
 let s=newCount();s=save(s,[[1,7],[2,6],[3,0]]);s=action(s,'revisar');
 movimentar({movimento_produto_id:2,movimento_tipo:'entrada',movimento_quantidade:1},1,randomUUID());
 movimentar({movimento_produto_id:2,movimento_tipo:'saida',movimento_quantidade:1},1,randomUUID());
 const totalMovements=await count('pi2_movimentos_estoque');bad(409,()=>action(s,'aprovar'));assert.equal(await balance(1),8,'no earlier item adjusted before conflict');assert.equal(await count('pi2_movimentos_estoque'),totalMovements);
 s=action(s,'recontar','Movimentação durante conferência');assert.equal(s.estado,'aberto');assert.ok(s.itens.every(i=>i.contado===null));assert.equal(s.itens.find(i=>i.produto_id===2).saldo,5.25);assert.ok(s.eventos.find(e=>e.acao==='recontar').conteudo.referencia_anterior.some(i=>i.contado_milesimos!==null));
 s=save(s,[[1,8],[2,5.25],[3,0]]);s=action(s,'revisar');s=action(s,'aprovar');assert.equal(await count('pi2_movimentos_estoque'),totalMovements,'no difference means no movement');
 // A failure in the second adjustment must roll back the first adjustment and inventory status.
 let rollback=newCount();rollback=save(rollback,[[1,7],[2,6],[3,0]]);rollback=action(rollback,'revisar');
 const collisionKey=`inventario-${rollback.inventario_id}-produto-2`;
 await pool.query("INSERT INTO pi2_movimentos_estoque(movimento_produto_id,movimento_quantidade,movimento_tipo,movimento_chave) VALUES(4,1,'entrada',$1)",[collisionKey]);
 const beforeFailure=await count('pi2_movimentos_estoque');bad(409,()=>action(rollback,'aprovar'));
 assert.equal(await balance(1),8);assert.equal(await balance(2),5.25);assert.equal(await count('pi2_movimentos_estoque'),beforeFailure);assert.equal(obterInventario(rollback.inventario_id).estado,'revisao');assert.ok(obterInventario(rollback.inventario_id).itens.every(i=>i.movimento_id===null));
 await pool.query('DELETE FROM pi2_movimentos_estoque WHERE movimento_chave=$1',[collisionKey]);
 // Unit and active status changes invalidate the reference.
 let u=newCount();u=save(u,[[1,8],[2,5.25],[3,0]]);
 await pool.query('UPDATE pi2_produtos SET produto_unidade_id=2 WHERE produto_id=1');bad(409,()=>action(u,'revisar'));
 await pool.query('UPDATE pi2_produtos SET produto_unidade_id=1,produto_estado=0 WHERE produto_id=1');bad(409,()=>action(u,'revisar'));bad(409,()=>action(u,'recontar'));
 await pool.query('UPDATE pi2_produtos SET produto_estado=1 WHERE produto_id=1');
 u=action(u,'cancelar','Contagem interrompida');assert.equal(u.estado,'cancelado');assert.equal(await balance(1),8);
 // Active consultation/employee accounts cannot invoke write services.
 await pool.query("INSERT INTO pi2_usuarios(usuario_id,usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status,usuario_operar_estoque) VALUES(2,'funcionario','qa@local','hash',3,1,1),(3,'gerente','manager@local','hash',2,1,0)");
 bad(403,()=>criarInventario({titulo:'Sem permissão',produtos:[1]},2,randomUUID()));bad(403,()=>salvarContagem(d.inventario_id,{versao:d.versao,itens:[{produto:1,quantidade:2}]},2));bad(403,()=>acaoInventario(d.inventario_id,'aprovar',{versao:approvalVersion,motivo:'Diferenças conferidas'},2,approvalKey));
 assert.ok(criarInventario({titulo:'Gerente',produtos:[1]},3,randomUUID()));
 for(let i=0;i<11;i++)newCount();assert.equal(listarInventarios({}).itens.length,10);assert.ok(listarInventarios({pagina:'2'}).itens.length>0);assert.equal(listarInventarios({estado:'aprovado'}).total,2);
 for(const input of [{pagina:'0'},{estado:'bad'},{pagina:['1']}])bad(400,()=>listarInventarios(input));
 console.log('PASS: inventory lifecycle, count validation, zero/unset, roles, snapshots, fractions, concurrency, atomic rollback, idempotent approval, immutable adjustments, cancellation, re-count audit and pagination.');
})().catch(e=>{console.error(e);process.exitCode=1});
