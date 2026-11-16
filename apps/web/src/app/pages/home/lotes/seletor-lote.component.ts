import { Component,Input,Output,EventEmitter,OnChanges,OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { LotesService,ConsultaLotes,Lote,EscolhaLote } from 'src/app/shared/services/lotes.service';
@Component({standalone:false,selector:'app-seletor-lote',templateUrl:'./seletor-lote.component.html',styleUrl:'./lotes.component.scss'})
export class SeletorLoteComponent implements OnChanges,OnDestroy {
 @Input() produtoId:number|null|undefined; @Input() disabled=false; @Input() consulta=false;
 @Output() escolha=new EventEmitter<EscolhaLote>();
 dados:ConsultaLotes|null=null;selecionado:Lote|null=null;loading=false;error='';q='';pagina=1;estado='todos';private request?:Subscription;
 constructor(private service:LotesService){}
 ngOnChanges(changes:any){if(changes.produtoId){this.selecionado=null;this.q='';this.pagina=1;this.carregar();}}
 emitir(pronto:boolean){this.escolha.emit({id:this.selecionado?.lote_id??null,codigo:this.selecionado?.codigo??null,validade:this.selecionado?.validade??null,saldo:this.selecionado?this.selecionado.saldo_milesimos/1000:this.dados?.sem_lote??0,pronto});}
 carregar(){this.request?.unsubscribe();this.loading=false;this.error='';this.emitir(false);if(!this.produtoId){this.dados=null;return;}this.loading=true;
  this.request=this.service.consultar(this.produtoId,{q:this.q,pagina:this.pagina,tamanho:10,estado:this.estado}).subscribe({next:d=>{this.dados=d;this.pagina=d.pagina;this.loading=false;this.emitir(true);},error:e=>{this.dados=null;this.loading=false;this.error=e.error?.message||'Não foi possível consultar os lotes.';this.emitir(false);}});
 }
 selecionar(l:Lote|null){if(this.disabled||this.loading)return;this.selecionado=l;this.emitir(true);}
 situacao(l:Lote){if(!l.validade||!this.dados)return 'Validade não informada';const hoje=this.dados.data_referencia;if(l.validade<hoje)return 'Vencido';if(l.validade===hoje)return 'Vence hoje';const limite=new Date(hoje+'T12:00:00Z');limite.setUTCDate(limite.getUTCDate()+30);return l.validade<=limite.toISOString().slice(0,10)?'Vence em até 30 dias':'No prazo';}
 ngOnDestroy(){this.request?.unsubscribe();}
}
