import { ChangeDetectionStrategy } from '@angular/core';
import { EscolhaLote } from 'src/app/shared/services/lotes.service';
import { Component,OnInit,OnDestroy,ViewChild,ElementRef } from '@angular/core';
import { FormBuilder,Validators,AbstractControl } from '@angular/forms';
import { Subject,Subscription } from 'rxjs';
import { debounceTime,finalize,takeUntil,timeout } from 'rxjs/operators';
import { ProdutoCatalogo } from 'src/app/shared/models/catalogo.model';
import { Produto } from 'src/app/shared/models/produto.model';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { MovimentacaoEstoqueService } from 'src/app/shared/services/movimentacao-estoque.service';
import { MovimentacaoEstoque } from 'src/app/shared/models/movimentacao-estoque.model';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,selector:'app-operar-estoque',templateUrl:'./operar-estoque.component.html',styleUrl:'./operar-estoque.component.scss'})
export class OperarEstoqueComponent implements OnInit,OnDestroy {
 lote:EscolhaLote={id:null,codigo:null,validade:null,saldo:0,pronto:false};
 escolherLote(l:EscolhaLote){this.lote=l;this.chave=crypto.randomUUID();this.revisando=false;}
 produtos:ProdutoCatalogo[]=[];selecionado:Produto|null=null;loading=false;saving=false;revisando=false;error='';success='';total=0;
 modo:'busca'|'codigo'='busca';loadingCodigo=false;erroCodigo='';codigoSelecionado:string|null=null;
 busca=this.fb.nonNullable.control('');
 codigo=this.fb.nonNullable.control('',[Validators.required,Validators.maxLength(80),(c:AbstractControl)=>typeof c.value==='string'&&c.value.trim()&&!/[\u0000-\u001f\u007f]/.test(c.value)?null:{codigo:true}]);
 form=this.fb.nonNullable.group({tipo:['saida',Validators.required],quantidade:[1,[Validators.required,Validators.min(.001),Validators.max(1e9),(c:AbstractControl)=>typeof c.value==='number'&&Math.abs(c.value*1000-Math.round(c.value*1000))<.00001?null:{precisao:true}]],observacao:['',Validators.maxLength(500)]});
 @ViewChild('revisao') revisao?:ElementRef<HTMLElement>;
 private leitor?:ElementRef<HTMLInputElement>;
 @ViewChild('leitorInput') set leitorInput(value:ElementRef<HTMLInputElement>|undefined){this.leitor=value;if(value)this.focarLeitor();}
 @ViewChild('produtoEscolhido') set produtoEscolhido(value:ElementRef<HTMLElement>|undefined){if(value)queueMicrotask(()=>{if(!this.encerrado&&this.selecionado&&!this.saving)value.nativeElement.focus();});}
 private encerrado=false;private destroy=new Subject<void>();private request?:Subscription;private consulta?:Subscription;private leitura?:Subscription;private chave=crypto.randomUUID();
 constructor(private fb:FormBuilder,public auth:AuthService,private produtosService:ProdutoService,private service:MovimentacaoEstoqueService){}
 get autorizado(){return this.auth.podeOperarEstoque();}
 get saldoApos(){const p=this.selecionado;if(!p)return 0;return (Math.round(p.produto_quantidade_estoque*1000)+(this.form.value.tipo==='entrada'?1:-1)*Math.round((this.form.value.quantidade||0)*1000))/1000;}
 ngOnInit(){
  this.busca.valueChanges.pipe(debounceTime(300),takeUntil(this.destroy)).subscribe(()=>{if(this.modo==='busca'&&!this.selecionado&&!this.saving)this.atualizar();});
  this.codigo.valueChanges.pipe(takeUntil(this.destroy)).subscribe(()=>{this.leitura?.unsubscribe();this.erroCodigo='';});
  this.form.valueChanges.pipe(takeUntil(this.destroy)).subscribe(()=>{this.chave=crypto.randomUUID();this.revisando=false;this.error='';});
  if(this.autorizado)this.atualizar();
 }
 atualizar(){
  if(this.encerrado||!this.autorizado||this.modo!=='busca'||this.saving)return;
  this.consulta?.unsubscribe();this.loading=true;this.error='';
  this.consulta=this.produtosService.getCatalogo({q:this.busca.value,estado:'ativos',tamanho:10,pagina:1}).pipe(finalize(()=>this.loading=false)).subscribe({next:data=>{this.produtos=data.itens;this.total=data.total;},error:()=>{this.produtos=[];this.total=0;this.error='Não foi possível buscar os produtos. Tente novamente.';}});
 }
 mudarModo(modo:'busca'|'codigo'){
  if(this.saving||this.selecionado)return;
  this.consulta?.unsubscribe();this.leitura?.unsubscribe();this.modo=modo;this.error='';this.erroCodigo='';
  if(modo==='busca')this.atualizar();else this.focarLeitor();
 }
 private focarLeitor(){queueMicrotask(()=>{if(!this.encerrado&&this.modo==='codigo'&&!this.selecionado&&!this.saving&&this.leitor){this.leitor.nativeElement.focus();this.leitor.nativeElement.select();}});}
 lerCodigo(){
  if(!this.autorizado||this.modo!=='codigo'||this.saving||this.loadingCodigo||this.selecionado)return;
  if(this.codigo.invalid){this.codigo.markAsTouched();this.erroCodigo='Leia ou digite um código de até 80 caracteres.';return;}
  const codigo=this.codigo.value.trim();this.erroCodigo='';this.error='';this.loadingCodigo=true;
  this.leitura=this.produtosService.getProdutoPorCodigo(codigo).pipe(finalize(()=>{this.loadingCodigo=false;if(!this.selecionado)this.focarLeitor();})).subscribe({next:p=>this.selecionar(p,codigo),error:e=>this.erroCodigo=e.error?.message||'Não foi possível consultar o código. Confira a conexão e tente novamente.'});
 }
 cancelarLeitura(){this.leitura?.unsubscribe();this.erroCodigo='';this.focarLeitor();}
 selecionar(p:Produto,codigo:string|null=null){
  if(this.saving)return;
  this.consulta?.unsubscribe();this.selecionado=p;this.codigoSelecionado=codigo;this.revisando=false;
  this.form.reset({tipo:this.form.controls.tipo.value,quantidade:1,observacao:''},{emitEvent:false});
  this.chave=crypto.randomUUID();this.error='';this.erroCodigo='';this.success='';
 }
 trocarProduto(){if(this.saving)return;this.selecionado=null;this.codigoSelecionado=null;this.revisando=false;this.error='';this.codigo.setValue('',{emitEvent:false});if(this.modo==='busca')this.atualizar();}
 ajustar(delta:number){const value=Math.max(.001,Math.min(1e9,Math.round((this.form.controls.quantidade.value+delta)*1000)/1000));this.form.controls.quantidade.setValue(value);}
 revisar(){if(this.form.invalid||!this.selecionado||this.saving||!this.lote.pronto)return;if(this.form.value.tipo==='saida'&&this.form.controls.quantidade.value>this.lote.saldo){this.error='Saldo insuficiente no lote selecionado.';return;}if(this.saldoApos<0){this.error='A quantidade supera o saldo disponível. Confira a quantidade.';return;}this.error='';this.revisando=true;setTimeout(()=>{if(!this.encerrado&&this.revisando){this.revisao?.nativeElement.focus();this.revisao?.nativeElement.scrollIntoView({block:'start',behavior:'smooth'});}},0);}
 confirmar(){
  if(!this.revisando||this.saving||this.form.invalid||!this.selecionado)return;
  const values=this.form.getRawValue();const nome=this.selecionado.produto_descricao;this.saving=true;this.error='';this.form.disable({emitEvent:false});this.busca.disable({emitEvent:false});
  const body={movimento_lote_id:this.lote.id,movimento_produto_id:this.selecionado.produto_id!,movimento_tipo:values.tipo,movimento_quantidade:values.quantidade,movimento_observacao:values.observacao,...(this.codigoSelecionado!==null?{movimento_codigo_lido:this.codigoSelecionado}:{})} as MovimentacaoEstoque;
  this.request=this.service.createNewMovimentacaoEstoque(body,this.chave).pipe(timeout(15000),finalize(()=>{this.saving=false;this.form.enable({emitEvent:false});this.busca.enable({emitEvent:false});if(this.modo==='codigo'&&!this.selecionado)this.focarLeitor();})).subscribe({next:m=>{
   this.success=`${values.tipo==='saida'?'Saída':'Entrada'} registrada para ${nome}. Movimento #${m.movimento_id}. Saldo: ${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(m.movimento_saldo_posterior??0)}.`;
   this.selecionado=null;this.codigoSelecionado=null;this.revisando=false;this.codigo.setValue('',{emitEvent:false});this.form.reset({tipo:'saida',quantidade:1,observacao:''},{emitEvent:false});this.chave=crypto.randomUUID();
   // Finalize releases saving before refreshing/focusing the next operation.
   queueMicrotask(()=>{if(!this.encerrado&&!this.saving&&this.modo==='busca')this.atualizar();});
  },error:e=>this.error=e.error?.message||'Não foi possível confirmar a operação. Seus dados foram mantidos; tente novamente sem duplicar o registro.'});
 }
 ngOnDestroy(){this.encerrado=true;this.request?.unsubscribe();this.consulta?.unsubscribe();this.leitura?.unsubscribe();this.destroy.next();this.destroy.complete();}
}
