import {centavos, textoCentavos, validarDinheiro} from 'src/app/shared/utils/dinheiro';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { ComprasService, Compra, CompraInput, ItemCompra } from 'src/app/shared/services/compras.service';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,selector:'app-pedidos',templateUrl:'./pedidos.component.html',styleUrl:'./pedidos.component.scss'})
export class PedidosComponent implements OnInit, OnDestroy {
 pedidos:Compra[]=[];
 detalhe:Compra|null=null; editando=false; novo=false; acao=''; motivo=''; error=''; success=''; loading=false; saving=false;
 documento=''; linhasEntrega:{item:number;produto:string;max:number;quantidade:number;codigo:string;validade:string;lote_id:number|null;lotes:ItemCompra["lotes_devolviveis"]}[]=[];
 q=''; estado=''; pagina=1; tamanho=10; total=0;
 private alteracoes?:Subscription; private consulta?:Subscription; private operacao?:Subscription;
 custosForm=this.fb.group({frete:['0.00',validarDinheiro()],despesas:['0.00',validarDinheiro()],desconto:['0.00',validarDinheiro()],referencia:['',Validators.maxLength(160)],regular:[false],tributos:this.fb.array([] as ReturnType<PedidosComponent['tributo']>[])});
 creditoEntrega:number|null=null; creditoForm=this.fb.group({valor:['',validarDinheiro()],documento:['',[Validators.required,Validators.maxLength(120)]],motivo:['',[Validators.required,Validators.minLength(3),Validators.maxLength(450)]]});
 private alteracoesCustos?:Subscription; private alteracoesCredito?:Subscription; private chaveCredito=crypto.randomUUID();
 get tributos(){return this.custosForm.controls.tributos;}
 tributo(){return this.fb.group({codigo:['ICMS',Validators.required],tratamento:['informativo',Validators.required],valor:['0.00',validarDinheiro()]});}
 private custosInput(){const v=this.custosForm.getRawValue();return {frete_centavos:centavos(v.frete)!,despesas_centavos:centavos(v.despesas)!,desconto_centavos:centavos(v.desconto)!,regime:'simples',ibs_cbs_regular:!!v.regular,referencia_documento:v.referencia?.trim()||'',tributos:v.tributos.map(t=>({codigo:t.codigo!,tratamento:t.tratamento!,valor_centavos:centavos(t.valor)!}))};}
 get custosValidos(){return this.custosForm.valid&&(!this.tributos.length||!!this.custosForm.controls.referencia.value?.trim())&&(this.custosForm.controls.regular.value||!this.tributos.controls.some(t=>['IBS','CBS'].includes(t.controls.codigo.value!)&&t.controls.tratamento.value?.startsWith('recuperavel')));}
 iniciarCredito(entrega:number){this.creditoEntrega=entrega;this.creditoForm.reset({valor:'',documento:'',motivo:''});this.chaveCredito=crypto.randomUUID();}
 salvarCredito(){if(!this.detalhe||!this.creditoEntrega||this.creditoForm.invalid||!centavos(this.creditoForm.controls.valor.value)||this.saving)return;const v=this.creditoForm.getRawValue();this.saving=true;this.creditoForm.disable({emitEvent:false});this.error='';this.operacao=this.service.credito(this.detalhe.pedido_id,this.creditoEntrega,{valor_centavos:centavos(v.valor)!,documento:v.documento!.trim(),motivo:v.motivo!.trim()},this.chaveCredito).pipe(timeout(15000),finalize(()=>{this.saving=false;this.creditoForm.enable({emitEvent:false});})).subscribe({next:()=>{this.creditoEntrega=null;this.success='Crédito comercial registrado sem alterar o estoque.';this.saving=false;this.abrir(this.detalhe!);},error:e=>this.error=e.error?.message||'Falha ao registrar crédito. Tente novamente com os mesmos dados.'});}
 private chave=crypto.randomUUID(); private chaveReceber=crypto.randomUUID();
 form=this.fb.group({fornecedor:[null as number|null,Validators.required],observacao:['',Validators.maxLength(500)],itens:this.fb.array([this.item()])});
 constructor(private fb:FormBuilder,private service:ComprasService,public auth:AuthService,private route:ActivatedRoute){}
 tratamentoTributo(v:string){return ({informativo:'Informativo, sem ajuste',recuperavel_incluso:'Recuperável, descontado do custo',recuperavel_adicional:'Recuperável, fora do preço',nao_recuperavel_incluso:'Não recuperável, já incluído',nao_recuperavel_adicional:'Não recuperável, acrescentado ao custo'} as Record<string,string>)[v]||v;}
 moedaExata(v:string){const [inteiro,fracao='']=v.split('.');return 'R$ '+inteiro.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+fracao.padEnd(2,'0').slice(0,2);}
 get podeAlterar(){return this.auth.isAdmin()||this.auth.isGerente();}
 get itens(){return this.form.controls.itens as FormArray;}
 item(){return this.fb.group({produto:[null as number|null,Validators.required],quantidade:[1,[Validators.required,Validators.min(.001),Validators.max(1e9)]],preco:['0.00',[Validators.required,validarDinheiro()]]});}
 ngOnInit(){this.alteracoesCustos=this.custosForm.valueChanges.subscribe(()=>this.alterarEntrega());this.alteracoesCredito=this.creditoForm.valueChanges.subscribe(()=>this.chaveCredito=crypto.randomUUID());this.alteracoes=this.form.valueChanges.subscribe(()=>this.chave=crypto.randomUUID());this.carregar();
 const pedidoId=Number(this.route.snapshot.queryParamMap.get('id'));
 if(Number.isSafeInteger(pedidoId)&&pedidoId>0){this.abrir({pedido_id:pedidoId} as Compra);return;}
 const sugestoes=history.state?.reposicao;
 if(this.podeAlterar&&Array.isArray(sugestoes)&&sugestoes.length>0&&sugestoes.length<=100&&sugestoes.every(i=>Number.isSafeInteger(i.produto)&&i.produto>0&&typeof i.quantidade==='number'&&Number.isFinite(i.quantidade)&&i.quantidade>0&&i.quantidade<=1e9)){
  this.criar();this.itens.clear();for(const i of sugestoes){const group=this.item();group.patchValue({produto:i.produto,quantidade:i.quantidade,preco:'0.00'});this.itens.push(group);}
  this.form.patchValue({observacao:'Reposição sugerida pelo estoque mínimo. Revisar quantidades e preços.'});
  this.success='Sugestões carregadas. Escolha o fornecedor e informe os preços (iniciados em zero). Confira as compras pendentes antes de salvar.';
  const {reposicao,...state}=history.state;history.replaceState(state,'');
 }
}
 ngOnDestroy(){this.alteracoesCustos?.unsubscribe();this.alteracoesCredito?.unsubscribe();this.alteracoes?.unsubscribe();this.consulta?.unsubscribe();this.operacao?.unsubscribe();}
 rotulo(estado:string|null){return ({rascunho:'Rascunho',confirmado:'Confirmado',parcial:'Recebido parcialmente',encerrado:'Saldo encerrado',recebido:'Recebido',cancelado:'Cancelado'} as Record<string,string>)[estado||'']||'Legado · consulta';}
 carregar(){this.consulta?.unsubscribe();this.loading=true;this.error='';this.consulta=this.service.listar({q:this.q,estado:this.estado,pagina:this.pagina,tamanho:this.tamanho}).pipe(timeout(15000),finalize(()=>this.loading=false)).subscribe({next:lista=>{this.pedidos=lista.itens;this.total=lista.total;this.pagina=lista.pagina;},error:e=>{this.pedidos=[];this.total=0;this.error=e.error?.message||'Não foi possível carregar os pedidos.';}});}
 filtrar(){this.pagina=1;this.carregar();}
 paginar(e:{pageIndex:number;pageSize:number}){this.pagina=e.pageIndex+1;this.tamanho=e.pageSize;this.carregar();}
 abrir(p:Compra){if(this.saving)return;this.operacao?.unsubscribe();this.error='';this.saving=true;this.editando=false;this.acao='';this.operacao=this.service.obter(p.pedido_id).pipe(timeout(15000),finalize(()=>this.saving=false)).subscribe({next:d=>{this.detalhe=d;this.novo=false;this.chaveReceber=crypto.randomUUID();},error:e=>this.error=e.error?.message||'Não foi possível abrir o pedido.'});}
 criar(){this.detalhe=null;this.novo=true;this.editando=true;this.acao='';this.error='';this.success='';this.itens.clear();this.itens.push(this.item());this.form.reset({fornecedor:null,observacao:'',itens:[{produto:null,quantidade:1,preco:'0.00'}]});this.chave=crypto.randomUUID();}
 editar(){if(!this.detalhe)return;this.editando=true;this.novo=false;this.acao='';this.itens.clear();for(const i of this.detalhe.itens){const group=this.item();group.patchValue({produto:i.item_pedido_produto_id,quantidade:i.item_pedido_quantidade,preco:textoCentavos(i.item_preco_centavos)});this.itens.push(group);}this.form.patchValue({fornecedor:this.detalhe.pedido_fornecedor_id,observacao:this.detalhe.pedido_observacao});}
 salvar(){if(this.form.invalid||this.saving){this.form.markAllAsTouched();return;}const raw=this.form.getRawValue();const body:CompraInput={fornecedor:raw.fornecedor!,observacao:raw.observacao||'',...(this.detalhe?{versao:this.detalhe.pedido_versao}:{}),itens:raw.itens.map((i:any)=>({produto:Number(i.produto),quantidade:Number(i.quantidade),preco_centavos:centavos(i.preco)!}))};this.saving=true;this.error='';this.form.disable({emitEvent:false});this.operacao=this.service.salvar(body,this.chave,this.novo?undefined:this.detalhe!.pedido_id).pipe(timeout(15000),finalize(()=>{this.saving=false;this.form.enable({emitEvent:false});})).subscribe({next:d=>{this.detalhe=d;this.editando=false;this.novo=false;this.success='Rascunho salvo. O estoque ainda não foi alterado.';this.pagina=1;this.carregar();},error:e=>this.error=e.error?.message||'Falha ao salvar. Tente novamente com o mesmo formulário.'});}
 get entregaValida(){return this.linhasEntrega.some(i=>i.quantidade>0) && this.linhasEntrega.every(i=>Number.isFinite(i.quantidade)&&i.quantidade>=0&&i.quantidade<=i.max&&(!i.validade||!!i.codigo.trim())&&(this.acao!=='devolver'||i.quantidade===0||i.lotes.some(l=>l.lote_id===i.lote_id&&l.quantidade>=i.quantidade))&&Math.abs(i.quantidade*1000-Math.round(i.quantidade*1000))<0.00001);}
 alterarEntrega(){this.chaveReceber=crypto.randomUUID();}
 preparar(acao:string){this.creditoEntrega=null;this.tributos.clear();this.custosForm.reset({frete:'0.00',despesas:'0.00',desconto:'0.00',referencia:'',regular:false});this.acao=acao;this.motivo='';this.documento='';this.error='';this.chaveReceber=crypto.randomUUID();this.linhasEntrega=(this.detalhe?.itens||[]).map(i=>({item:i.item_pedido_id,produto:i.produto,max:acao==='receber'?i.quantidade_pendente:i.quantidade_devolvivel,quantidade:acao==='receber'?i.quantidade_pendente:0,codigo:'',validade:'',lote_id:null as number|null,lotes:i.lotes_devolviveis})).filter(i=>i.max>0);}

 executar(){if(!this.detalhe||this.saving||(this.acao==='receber'&&!this.custosValidos)||(['receber','devolver'].includes(this.acao)&&!this.entregaValida))return;this.saving=true;this.custosForm.disable({emitEvent:false});this.error='';this.operacao=this.service.transicao(this.detalhe,this.acao,this.motivo,this.chaveReceber,['receber','devolver'].includes(this.acao)?{documento:this.documento,...(this.acao==='receber'?{custos:this.custosInput()}:{}),itens:this.linhasEntrega.filter(i=>i.quantidade>0).map(i=>({item:i.item,quantidade:i.quantidade,...(this.acao==='receber'&&i.codigo.trim()?{lote:{codigo:i.codigo.trim(),validade:i.validade||null}}:{}),...(this.acao==='devolver'?{lote_id:i.lote_id}:{})}))}:undefined).pipe(timeout(15000),finalize(()=>{this.saving=false;this.custosForm.enable({emitEvent:false});})).subscribe({next:d=>{this.detalhe=d;this.acao='';this.success='Operação registrada. Quantidades e histórico atualizados.';this.carregar();},error:e=>this.error=e.error?.message||'Falha na operação. Tente novamente; o recebimento não será duplicado.'});}
}
