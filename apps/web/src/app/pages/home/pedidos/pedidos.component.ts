import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { ComprasService, Compra, CompraInput } from 'src/app/shared/services/compras.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { Produto } from 'src/app/shared/models/produto.model';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({selector:'app-pedidos',templateUrl:'./pedidos.component.html',styleUrl:'./pedidos.component.scss'})
export class PedidosComponent implements OnInit, OnDestroy {
 pedidos:Compra[]=[]; produtos:Produto[]=[]; fornecedores:Fornecedor[]=[];
 detalhe:Compra|null=null; editando=false; novo=false; acao=''; motivo=''; error=''; success=''; loading=false; saving=false;
 documento=''; linhasEntrega:{item:number;produto:string;max:number;quantidade:number}[]=[];
 q=''; estado=''; pagina=1; tamanho=10; total=0;
 private consulta?:Subscription; private operacao?:Subscription;
 private chave=crypto.randomUUID(); private chaveReceber=crypto.randomUUID();
 form=this.fb.group({fornecedor:[null as number|null,Validators.required],observacao:['',Validators.maxLength(500)],itens:this.fb.array([this.item()])});
 constructor(private fb:FormBuilder,private service:ComprasService,private produtoService:ProdutoService,private fornecedorService:FornecedorService,public auth:AuthService){}
 get podeAlterar(){return this.auth.isAdmin()||this.auth.isGerente();}
 get itens(){return this.form.controls.itens as FormArray;}
 item(){return this.fb.group({produto:[null as number|null,Validators.required],quantidade:[1,[Validators.required,Validators.min(.001),Validators.max(1e9)]],preco:['0.00',[Validators.required,Validators.pattern(/^\d+([.,]\d{1,2})?$/)]]});}
 ngOnInit(){this.form.valueChanges.subscribe(()=>this.chave=crypto.randomUUID());this.carregar();}
 ngOnDestroy(){this.consulta?.unsubscribe();this.operacao?.unsubscribe();}
 rotulo(estado:string|null){return ({rascunho:'Rascunho',confirmado:'Confirmado',parcial:'Recebido parcialmente',encerrado:'Saldo encerrado',recebido:'Recebido',cancelado:'Cancelado'} as Record<string,string>)[estado||'']||'Legado · consulta';}
 carregar(){this.consulta?.unsubscribe();this.loading=true;this.error='';this.consulta=forkJoin({lista:this.service.listar({q:this.q,estado:this.estado,pagina:this.pagina,tamanho:this.tamanho}),produtos:this.produtoService.getProdutos(),fornecedores:this.fornecedorService.getFornecedores()}).pipe(timeout(15000),finalize(()=>this.loading=false)).subscribe({next:({lista,produtos,fornecedores})=>{this.pedidos=lista.itens;this.total=lista.total;this.pagina=lista.pagina;this.produtos=produtos;this.fornecedores=fornecedores;},error:e=>{this.pedidos=[];this.total=0;this.error=e.error?.message||'Não foi possível carregar os pedidos.';}});}
 filtrar(){this.pagina=1;this.carregar();}
 paginar(e:{pageIndex:number;pageSize:number}){this.pagina=e.pageIndex+1;this.tamanho=e.pageSize;this.carregar();}
 abrir(p:Compra){if(this.saving)return;this.operacao?.unsubscribe();this.error='';this.saving=true;this.editando=false;this.acao='';this.operacao=this.service.obter(p.pedido_id).pipe(timeout(15000),finalize(()=>this.saving=false)).subscribe({next:d=>{this.detalhe=d;this.novo=false;this.chaveReceber=crypto.randomUUID();},error:e=>this.error=e.error?.message||'Não foi possível abrir o pedido.'});}
 criar(){this.detalhe=null;this.novo=true;this.editando=true;this.acao='';this.error='';this.success='';this.itens.clear();this.itens.push(this.item());this.form.reset({fornecedor:null,observacao:'',itens:[{produto:null,quantidade:1,preco:'0.00'}]});this.chave=crypto.randomUUID();}
 editar(){if(!this.detalhe)return;this.editando=true;this.novo=false;this.acao='';this.itens.clear();for(const i of this.detalhe.itens){const group=this.item();group.patchValue({produto:i.item_pedido_produto_id,quantidade:i.item_pedido_quantidade,preco:((i.item_preco_centavos||0)/100).toFixed(2)});this.itens.push(group);}this.form.patchValue({fornecedor:this.detalhe.pedido_fornecedor_id,observacao:this.detalhe.pedido_observacao});}
 salvar(){if(this.form.invalid||this.saving){this.form.markAllAsTouched();return;}const raw=this.form.getRawValue();const body:CompraInput={fornecedor:raw.fornecedor!,observacao:raw.observacao||'',...(this.detalhe?{versao:this.detalhe.pedido_versao}:{}),itens:raw.itens.map((i:any)=>({produto:Number(i.produto),quantidade:Number(i.quantidade),preco_centavos:Math.round(Number(i.preco.replace(',','.'))*100)}))};this.saving=true;this.error='';this.form.disable({emitEvent:false});this.operacao=this.service.salvar(body,this.chave,this.novo?undefined:this.detalhe!.pedido_id).pipe(timeout(15000),finalize(()=>{this.saving=false;this.form.enable({emitEvent:false});})).subscribe({next:d=>{this.detalhe=d;this.editando=false;this.novo=false;this.success='Rascunho salvo. O estoque ainda não foi alterado.';this.pagina=1;this.carregar();},error:e=>this.error=e.error?.message||'Falha ao salvar. Tente novamente com o mesmo formulário.'});}
 get entregaValida(){return this.linhasEntrega.some(i=>i.quantidade>0) && this.linhasEntrega.every(i=>Number.isFinite(i.quantidade)&&i.quantidade>=0&&i.quantidade<=i.max&&Math.abs(i.quantidade*1000-Math.round(i.quantidade*1000))<0.00001);}
 alterarEntrega(){this.chaveReceber=crypto.randomUUID();}
 preparar(acao:string){this.acao=acao;this.motivo='';this.documento='';this.error='';this.chaveReceber=crypto.randomUUID();this.linhasEntrega=(this.detalhe?.itens||[]).map(i=>({item:i.item_pedido_id,produto:i.produto,max:acao==='receber'?i.quantidade_pendente:i.quantidade_devolvivel,quantidade:acao==='receber'?i.quantidade_pendente:0})).filter(i=>i.max>0);}

 executar(){if(!this.detalhe||this.saving)return;this.saving=true;this.error='';this.operacao=this.service.transicao(this.detalhe,this.acao,this.motivo,this.chaveReceber,['receber','devolver'].includes(this.acao)?{documento:this.documento,itens:this.linhasEntrega.filter(i=>i.quantidade>0).map(i=>({item:i.item,quantidade:i.quantidade}))}:undefined).pipe(timeout(15000),finalize(()=>this.saving=false)).subscribe({next:d=>{this.detalhe=d;this.acao='';this.success='Operação registrada. Quantidades e histórico atualizados.';this.carregar();},error:e=>this.error=e.error?.message||'Falha na operação. Tente novamente; o recebimento não será duplicado.'});}
}
