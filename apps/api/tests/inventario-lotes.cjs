const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const pool=require('/app/dist/config/db').default;
const {criarInventario,salvarContagem,acaoInventario,obterInventario,registrarLoteInventario}=require('/app/dist/services/inventarios');
const {movimentar,estornar}=require('/app/dist/services/estoque');
const {salvarPedido,transicionar}=require('/app/dist/services/pedidos');
const {consultarLotes}=require('/app/dist/services/lotes');const {listarHistorico}=require('/app/dist/services/historico');
const {relatorioConsumo}=require('/app/dist/services/relatorios-operacionais');
const bad=(status,fn)=>assert.throws(fn,e=>e.status===status);
(async()=>{
 await pool.query("INSERT INTO pi2_unidades(unidade_id,unidade_descricao) VALUES(1,'kg'),(2,'Pacote')");
 await pool.query("INSERT INTO pi2_fornecedores(fornecedor_nome) VALUES('QA')");
 await pool.query("INSERT INTO pi2_produtos(produto_id,produto_descricao,produto_estado,produto_unidade_id,produto_quantidade_estoque) VALUES(1,'Café',1,1,4),(2,'Outro',1,1,0),(3,'Limite',1,1,999999999),(4,'Unidade anterior',1,1,0)");
 await pool.query("INSERT INTO pi2_usuarios(usuario_nome,usuario_email,usuario_password,usuario_perfil_id,usuario_status,usuario_operar_estoque) VALUES('operador','op@qa.local','hash',3,1,1),('consulta','read@qa.local','hash',3,1,0)");
 let p=salvarPedido({fornecedor:1,itens:[{produto:1,quantidade:8,preco_centavos:100}]},1,randomUUID());p=transicionar(p.pedido_id,'confirmar',{versao:p.pedido_versao},1,'');
 const receive=(q,codigo)=>{p=transicionar(p.pedido_id,'receber',{versao:p.pedido_versao,itens:[{item:p.itens[0].item_pedido_id,quantidade:q,lote:{codigo,validade:'2028-02-29'}}]},1,randomUUID());};receive(5,'A');receive(3,'B');
 const a=consultarLotes(1).itens.find(l=>l.codigo==='A').lote_id,b=consultarLotes(1).itens.find(l=>l.codigo==='B').lote_id;
 const create=(produtos=[1],actor=1)=>criarInventario({titulo:'Conferência por lote',produtos,modo:'lotes'},actor,randomUUID());
 const save=(d,itens)=>salvarContagem(d.inventario_id,{versao:d.versao,itens},1);
 const counts=(d,values)=>d.itens.flatMap(i=>i.lotes.map(l=>({produto:i.produto_id,lote_id:l.lote_id,quantidade:values?.[i.produto_id+':'+(l.lote_id??'null')]??l.saldo})));
 const act=(d,action,key=randomUUID())=>acaoInventario(d.inventario_id,action,{versao:d.versao,...(action==='revisar'?{}:{motivo:'Conferência física concluída'})},1,key);
 let d=create();assert.equal(d.modo,'lotes');assert.equal(d.itens[0].lotes.length,3);assert.equal(d.itens[0].lotes.find(l=>l.lote_id===null).saldo,4);assert.equal(d.itens[0].contado,null);
 bad(403,()=>create([1],2));bad(403,()=>create([1],3));bad(400,()=>save(d,[{produto:1,quantidade:12}]));bad(400,()=>save(d,[{produto:1,lote_id:a,quantidade:1},{produto:1,lote_id:a,quantidade:1}]));
 for(const q of [-1,.0001,NaN,1e9+1,'2',undefined])bad(400,()=>save(d,[{produto:1,lote_id:a,quantidade:q}]));
 bad(400,()=>save(d,[{produto:2,lote_id:a,quantidade:1}]));bad(400,()=>save(d,[{produto:1,lote_id:999,quantidade:1}]));
 const orig=d.versao;d=save(d,[{produto:1,lote_id:a,quantidade:0}]);assert.equal(d.itens[0].contado,null,'a zero is counted, other buckets remain uncounted');bad(409,()=>act(d,'revisar'));
 bad(409,()=>salvarContagem(d.inventario_id,{versao:orig,itens:[{produto:1,lote_id:b,quantidade:1}]},1));
 // Equal product total still needs two physical bucket adjustments.
 d=save(d,counts(d,{['1:'+a]:4,['1:'+b]:4}));assert.equal(d.itens[0].contado,12);assert.equal(d.itens[0].diferenca,0);
 d=act(d,'revisar');const key=randomUUID(),approval={versao:d.versao,motivo:'Conferência física concluída'};
 d=act(d,'aprovar',key);assert.equal(d.estado,'aprovado');assert.equal(consultarLotes(1).saldo,12);assert.equal(consultarLotes(1).itens.find(l=>l.lote_id===a).saldo_milesimos,4000);assert.equal(consultarLotes(1).itens.find(l=>l.lote_id===b).saldo_milesimos,4000);
 const movements=d.itens[0].lotes.filter(l=>l.movimento_id);assert.equal(movements.length,2);assert.equal(d.eventos.at(-1).conteudo.ajustes.length,2);
 assert.equal(acaoInventario(d.inventario_id,'aprovar',approval,1,key).inventario_id,d.inventario_id);
 bad(409,()=>acaoInventario(d.inventario_id,'aprovar',{...approval,motivo:'Outro motivo'},1,key));
 bad(409,()=>estornar(movements[0].movimento_id,'Correção indevida',1,randomUUID()));bad(409,()=>save(d,counts(d)));bad(409,()=>act(d,'recontar'));
 assert.equal(listarHistorico({}).itens.filter(m=>m.movimento_inventario_id===d.inventario_id).length,2);
 assert.equal(relatorioConsumo({}).resumo.operacoes,0,'inventory withdrawals are not consumption');
 // Unidentified quantities can be physically found in an existing batch, with both movements audited.
 d=create();d=save(d,counts(d,{'1:null':2,['1:'+a]:6}));d=act(act(d,'revisar'),'aprovar');assert.equal(consultarLotes(1).sem_lote,2);assert.equal(consultarLotes(1).saldo,12);
 // Partial edits are transactional, and sum-per-product limit applies even before every bucket is counted.
 d=create();const previous=d.itens[0].lotes.find(l=>l.lote_id===a).contado;
 bad(400,()=>save(d,[{produto:1,lote_id:a,quantidade:1e9},{produto:1,lote_id:b,quantidade:1}]));assert.equal(obterInventario(d.inventario_id).itens[0].lotes.find(l=>l.lote_id===a).contado,previous);
 // Movements which restore the total still invalidate the reference.
 d=save(d,counts(d));movimentar({movimento_produto_id:1,movimento_quantidade:.125,movimento_tipo:'saida',movimento_lote_id:a},2,randomUUID());movimentar({movimento_produto_id:1,movimento_quantidade:.125,movimento_tipo:'entrada',movimento_lote_id:b},2,randomUUID());
 assert.equal(obterInventario(d.inventario_id).itens[0].referencia_alterada,true);bad(409,()=>act(d,'revisar'));
 const oldIds=d.itens[0].lotes.map(l=>l.contagem_id);d=act(d,'recontar');assert.equal(d.itens[0].contado,null);assert.ok(d.itens[0].lotes.every(l=>l.contado===null&&!oldIds.includes(l.contagem_id)));assert.equal(d.eventos.at(-1).conteudo.referencia_lotes_anterior.length,3);
 // Zero lots are counted explicitly and new lots invalidate the set, even without total change.
 const snapshotVersion=d.versao;
 await pool.query("INSERT INTO pi2_lotes(produto_id,codigo,unidade_id,unidade,criado_em,usuario_id) VALUES(1,'Novo zerado',1,'kg','2026-11-17',1)");
 assert.equal(obterInventario(d.inventario_id).itens[0].referencia_alterada,true);d=act(d,'recontar');assert.equal(d.itens[0].lotes.length,4);assert.ok(d.versao>snapshotVersion);
 d=save(d,counts(d));d=act(d,'revisar');
 // Failure on the last insert rolls back all prior bucket/product/movement changes and leaves review intact.
 const newId=d.itens[0].lotes.find(l=>l.codigo==='Novo zerado').lote_id;d=act(d,'recontar');d=save(d,counts(d,{['1:'+a]:1,['1:'+newId]:1}));d=act(d,'revisar');
 const before=consultarLotes(1),historyCount=(await pool.query('SELECT COUNT(*) AS n FROM pi2_movimentos_estoque')).rows[0].n;
 await pool.query(`CREATE TRIGGER falha_inventario_lote BEFORE INSERT ON pi2_movimentos_estoque WHEN NEW.movimento_lote_id=${newId} BEGIN SELECT RAISE(ABORT,'falha simulada'); END`);
 assert.throws(()=>act(d,'aprovar'));assert.equal(obterInventario(d.inventario_id).estado,'revisao');assert.deepEqual(consultarLotes(1),before);assert.equal((await pool.query('SELECT COUNT(*) AS n FROM pi2_movimentos_estoque')).rows[0].n,historyCount);
 await pool.query('DROP TRIGGER falha_inventario_lote');d=act(d,'aprovar');
 // Withdrawals first allow a redistribution at the maximum total without an intermediate overflow.
 const maxLot=pool.transaction(ex=>ex("INSERT INTO pi2_lotes(produto_id,codigo,unidade_id,unidade,saldo_milesimos,criado_em,usuario_id) VALUES(3,'MAX',1,'kg',999999999000,'2026-11-17',1) RETURNING lote_id").rows[0].lote_id);
 d=create([3]);d=save(d,counts(d,{'3:null':999999999,['3:'+maxLot]:0}));d=act(act(d,'revisar'),'aprovar');assert.equal(consultarLotes(3).sem_lote,999999999);assert.equal(consultarLotes(3).identificado,0);
 // No-difference approval does not generate movements, cancellation never writes stock.
 d=create([2]);d=save(d,counts(d));d=act(act(d,'revisar'),'aprovar');assert.equal(d.itens[0].lotes[0].movimento_id,null);
 d=create([2]);d=act(d,'cancelar');assert.equal(d.estado,'cancelado');
 // General inventories remain compatible and cannot be silently submitted as detailed counts.
 let legacy=criarInventario({titulo:'Legado geral',produtos:[1]},1,randomUUID());assert.equal(legacy.modo,'produto');bad(400,()=>save(legacy,[{produto:1,lote_id:null,quantidade:1}]));
 // A zero lot in a previous unit is historical and excluded from new snapshots.
 await pool.query("INSERT INTO pi2_lotes(produto_id,codigo,unidade_id,criado_em,usuario_id) VALUES(4,'OLD',2,'2026-11-17',1)");d=create([4]);assert.equal(d.itens[0].lotes.length,1);
 // New physical lots can be identified without faking a purchase or changing stock.
 movimentar({movimento_produto_id:4,movimento_tipo:'entrada',movimento_quantidade:5},1,randomUUID());
 d=create([4]);const concurrentInventory=create([4]);d=save(d,counts(d));
 const registration={versao:d.versao,produto:4,lote:{codigo:'000FOUND',validade:'2029-01-01'},motivo:'Lote identificado na conferência física'},registrationKey=randomUUID();
 bad(403,()=>registrarLoteInventario(d.inventario_id,registration,2,randomUUID()));bad(400,()=>registrarLoteInventario(d.inventario_id,registration,1,''));
 bad(400,()=>registrarLoteInventario(d.inventario_id,{...registration,lote:{codigo:'Bad date',validade:'2029-02-30'}},1,randomUUID()));
 const registerVersion=d.versao;d=registrarLoteInventario(d.inventario_id,registration,1,registrationKey);assert.equal(d.versao,registerVersion+1);assert.equal(d.itens[0].contado,null);assert.equal(consultarLotes(4).saldo,5);assert.equal(consultarLotes(4).identificado,0);
 assert.equal(d.itens[0].referencia_alterada,false);assert.equal(obterInventario(concurrentInventory.inventario_id).itens[0].referencia_alterada,true);
 assert.equal(registrarLoteInventario(d.inventario_id,registration,1,registrationKey).versao,d.versao);bad(409,()=>registrarLoteInventario(d.inventario_id,{...registration,motivo:'Outro motivo'},1,registrationKey));
 bad(409,()=>registrarLoteInventario(d.inventario_id,{...registration,versao:d.versao},1,randomUUID()));
 const found=d.itens[0].lotes.find(l=>l.codigo==='000FOUND');assert.equal(found.contado,null);assert.equal(found.saldo,0);
 d=save(d,[{produto:4,lote_id:null,quantidade:1},{produto:4,lote_id:found.lote_id,quantidade:4}]);d=act(act(d,'revisar'),'aprovar');assert.equal(consultarLotes(4).saldo,5);assert.equal(consultarLotes(4).sem_lote,1);assert.equal(consultarLotes(4).identificado,4);
 assert.equal(registrarLoteInventario(d.inventario_id,registration,1,registrationKey).estado,'aprovado');
 bad(409,()=>registrarLoteInventario(d.inventario_id,{...registration,versao:d.versao,lote:{codigo:'Too late'}},1,randomUUID()));
 d=create([4]);const reg={versao:d.versao,produto:4,lote:{codigo:'ZERO'},motivo:'Embalagem sem quantidade confirmada'};
 await pool.query("CREATE TRIGGER falha_registro BEFORE INSERT ON pi2_inventario_eventos WHEN NEW.acao='registro_lote' BEGIN SELECT RAISE(ABORT,'falha simulada'); END");
 assert.throws(()=>registrarLoteInventario(d.inventario_id,reg,1,randomUUID()));assert.ok(!consultarLotes(4).itens.some(l=>l.codigo==='ZERO'));assert.equal(obterInventario(d.inventario_id).versao,d.versao);await pool.query('DROP TRIGGER falha_registro');
 d=registrarLoteInventario(d.inventario_id,reg,1,randomUUID());d=act(d,'cancelar');assert.equal(consultarLotes(4).saldo,5);assert.equal(consultarLotes(4).itens.find(l=>l.codigo==='ZERO').saldo_milesimos,0);
 // Bounds do not truncate a snapshot: the whole opening is rolled back.
 for(let i=0;i<2000;i++)await pool.query("INSERT INTO pi2_lotes(produto_id,codigo,unidade_id,criado_em,usuario_id) VALUES(2,$1,1,'2026-11-17',1)",['L'+i]);
 const invCount=(await pool.query('SELECT COUNT(*) AS n FROM pi2_inventarios')).rows[0].n;bad(400,()=>create([2]));assert.equal((await pool.query('SELECT COUNT(*) AS n FROM pi2_inventarios')).rows[0].n,invCount);
 console.log('PASS: complete lot inventory lifecycle, zero/null, per-bucket changes at net zero, unidentified stock, fractions, roles, immutable links, consumption exclusion, sum limits, stale references/new lots, re-count audit, transactional rollback, ceiling redistribution, legacy compatibility and snapshot bounds.');
})().catch(e=>{console.error(e);process.exitCode=1;});
