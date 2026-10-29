import { Component,OnInit,OnDestroy,ViewChild,ElementRef } from '@angular/core';
import { FormBuilder,Validators,AbstractControl } from '@angular/forms';
import { Subject,of,Subscription } from 'rxjs';
import { debounceTime,switchMap,catchError,finalize,takeUntil,timeout } from 'rxjs/operators';
import { ProdutoCatalogo } from 'src/app/shared/models/catalogo.model';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { MovimentacaoEstoqueService } from 'src/app/shared/services/movimentacao-estoque.service';
import { MovimentacaoEstoque } from 'src/app/shared/models/movimentacao-estoque.model';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({selector:'app-operar-estoque',templateUrl:'./operar-estoque.component.html',styleUrl:'./operar-estoque.component.scss'})
export class OperarEstoqueComponent implements OnInit,OnDestroy {
 produtos:ProdutoCatalogo[]=[];selecionado:ProdutoCatalogo|null=null;loading=false;saving=false;revisando=false;error='';success='';total=0;
 busca=this.fb.nonNullable.control('');
 form=this.fb.nonNullable.group({tipo:['saida',Validators.required],quantidade:[1,[Validators.required,Validators.min(.001),Validators.max(1e9),(c:AbstractControl)=>typeof c.value==='number'&&Math.abs(c.value*1000-Math.round(c.value*1000))<.00001?null:{precisao:true}]],observacao:['',Validators.maxLength(500)]});
 @ViewChild('revisao') revisao?:ElementRef<HTMLElement>;
 private reload=new Subject<void>();private destroy=new Subject<void>();private request?:Subscription;private chave=crypto.randomUUID();
 constructor(private fb:FormBuilder,public auth:AuthService,private produtosService:ProdutoService,private service:MovimentacaoEstoqueService){}
 get autorizado(){return this.auth.podeOperarEstoque();}
 get saldoApos(){const p=this.selecionado;if(!p)return 0;return (Math.round(p.produto_quantidade_estoque*1000)+(this.form.value.tipo==='entrada'?1:-1)*Math.round((this.form.value.quantidade||0)*1000))/1000;}
 ngOnInit(){
  this.reload.pipe(switchMap(()=>{this.loading=true;this.error='';return this.produtosService.getCatalogo({q:this.busca.value,estado:'ativos',tamanho:10,pagina:1}).pipe(catchError(()=>{this.error='Não foi possível buscar os produtos. Tente novamente.';return of(null);}),finalize(()=>this.loading=false));}),takeUntil(this.destroy)).subscribe(data=>{this.produtos=data?.itens||[];this.total=data?.total||0;});
  this.busca.valueChanges.pipe(debounceTime(300),takeUntil(this.destroy)).subscribe(()=>this.reload.next());
  this.form.valueChanges.pipe(takeUntil(this.destroy)).subscribe(()=>{this.chave=crypto.randomUUID();this.revisando=false;this.error='';});
  if(this.autorizado)this.atualizar();
 }
 atualizar(){this.reload.next();}
 selecionar(p:ProdutoCatalogo){this.selecionado=p;this.revisando=false;this.chave=crypto.randomUUID();this.error='';this.success='';}
 ajustar(delta:number){const value=Math.max(.001,Math.min(1e9,Math.round((this.form.controls.quantidade.value+delta)*1000)/1000));this.form.controls.quantidade.setValue(value);}
 revisar(){if(this.form.invalid||!this.selecionado)return;if(this.saldoApos<0){this.error='A quantidade supera o saldo disponível. Confira a quantidade.';return;}this.error='';this.revisando=true;setTimeout(()=>{this.revisao?.nativeElement.focus();this.revisao?.nativeElement.scrollIntoView({block:'start',behavior:'smooth'});},0);}
 confirmar(){if(!this.revisando||this.saving||this.form.invalid||!this.selecionado)return;const values=this.form.getRawValue();const nome=this.selecionado.produto_descricao;this.saving=true;this.error='';this.form.disable({emitEvent:false});this.busca.disable({emitEvent:false});this.request=this.service.createNewMovimentacaoEstoque({movimento_produto_id:this.selecionado.produto_id!,movimento_tipo:values.tipo,movimento_quantidade:values.quantidade,movimento_observacao:values.observacao} as MovimentacaoEstoque,this.chave).pipe(timeout(15000),finalize(()=>{this.saving=false;this.form.enable({emitEvent:false});this.busca.enable({emitEvent:false});})).subscribe({next:m=>{this.success=`${values.tipo==='saida'?'Saída':'Entrada'} registrada para ${nome}. Movimento #${m.movimento_id}. Saldo: ${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(m.movimento_saldo_posterior??0)}.`;this.selecionado=null;this.revisando=false;this.form.reset({tipo:'saida',quantidade:1,observacao:''},{emitEvent:false});this.chave=crypto.randomUUID();this.atualizar();},error:e=>this.error=e.error?.message||'Não foi possível confirmar a operação. Seus dados foram mantidos; tente novamente sem duplicar o registro.'});}
 ngOnDestroy(){this.request?.unsubscribe();this.destroy.next();this.destroy.complete();}
}
