import {centavos} from 'src/app/shared/utils/dinheiro';
import { ChangeDetectionStrategy } from '@angular/core';
import { Component,OnInit,OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CustosService,Custos,EvolucaoCusto,PosicaoCusto,HistoricoCusto } from 'src/app/shared/services/custos.service';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({ changeDetection: ChangeDetectionStrategy.Eager,standalone:false,selector:'app-custos',templateUrl:'./custos.component.html',styleUrls:['./relatorios.component.scss','./custos.component.scss']})
export class CustosComponent implements OnInit,OnDestroy {
 hoje=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());data=this.hoje;q='';inicio='';fim=this.hoje;
 posicao:Custos|null=null;evolucao:EvolucaoCusto|null=null;loading=false;loadingEvolucao=false;saving=false;exporting=false;error='';erroEvolucao='';success='';pagina=1;tamanho=10;paginaDias=0;
 margem: {produto_id:number;venda_centavos:number|null;custo_medio_reais:string|null;margem_bruta_percentual:string|null;observacao:string}|null=null; loadingMargem=false;private consultaMargem?:Subscription;
 estimarMargem(produto:number){this.consultaMargem?.unsubscribe();this.margem=null;this.loadingMargem=true;this.consultaMargem=this.service.margem(produto).pipe(finalize(()=>this.loadingMargem=false)).subscribe({next:r=>this.margem=r,error:e=>this.error=e.error?.message||'Falha ao estimar margem.'});}
 trilha:HistoricoCusto|null=null;loadingTrilha=false;private consultaTrilha?:Subscription;
 verHistorico(produto:number,pagina=1){this.consultaTrilha?.unsubscribe();this.loadingTrilha=true;this.error='';this.trilha=null;this.consultaTrilha=this.service.historico(produto,pagina).pipe(finalize(()=>this.loadingTrilha=false)).subscribe({next:r=>this.trilha=r,error:e=>this.error=e.error?.message||'Falha ao consultar histórico de custos.'});}
 avaliando:PosicaoCusto|null=null;custo='';motivo='';private chave=crypto.randomUUID();private consulta?:Subscription;private historico?:Subscription;private operacao?:Subscription;private download?:Subscription;private encerrado=false;
 constructor(public auth:AuthService,private service:CustosService){}
 get autorizado(){return this.auth.isAdmin()||this.auth.isGerente();}
 get alterados(){return !!this.posicao&&(this.data!==this.posicao.filtros.data||this.q!==this.posicao.filtros.q);}
 get evolucaoAlterada(){return !!this.evolucao&&(this.inicio!==this.evolucao.filtros.inicio||this.fim!==this.evolucao.filtros.fim||this.q!==this.evolucao.filtros.q);}
 get custoValido(){return /^\d+([.,]\d{1,2})?$/.test(this.custo)&&Number(this.custo.replace(',','.'))<=1e10&&this.motivo.trim().length>=3&&this.motivo.length<=350;}
 // Render exact decimal strings without converting large totals to floating point.
 moeda(v:string|null,casas=2){if(v===null)return 'Não conhecido';const [inteiro,frac='']=v.split('.');return 'R$ '+inteiro.replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+frac.padEnd(casas,'0').slice(0,casas);}
 origem(v:string){return ({abertura:'Referência inicial',referencia_alterada:'Unidade ou saldo alterados',manual:'Movimentação operacional',compra:'Recebimento/devolução de compra',inventario:'Ajuste de inventário',inicial:'Saldo inicial',avaliacao:'Avaliação justificada',estorno:'Estorno'} as Record<string,string>)[v]||v;}
 ngOnInit(){if(this.autorizado)this.carregar();}
 aplicar(){this.pagina=1;this.avaliando=null;this.carregar();}
 carregar(){if(!this.autorizado)return;this.consulta?.unsubscribe();this.loading=true;this.error='';this.posicao=null;this.consulta=this.service.posicao({data:this.data,q:this.q,pagina:this.pagina,tamanho:this.tamanho}).pipe(finalize(()=>this.loading=false)).subscribe({next:r=>{this.posicao=r;this.pagina=r.pagina;if(!this.inicio){const start=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date(r.cobertura_desde));const padrao=new Date(this.hoje+'T12:00:00Z');padrao.setUTCDate(padrao.getUTCDate()-29);this.inicio=start>padrao.toISOString().slice(0,10)?start:padrao.toISOString().slice(0,10);this.carregarEvolucao();}},error:e=>this.error=e.error?.message||'Não foi possível consultar os custos.'});}
 carregarEvolucao(){if(!this.autorizado||!this.inicio||!this.fim||this.inicio>this.fim)return;this.historico?.unsubscribe();this.loadingEvolucao=true;this.erroEvolucao='';this.evolucao=null;this.paginaDias=0;this.historico=this.service.evolucao({inicio:this.inicio,fim:this.fim,q:this.q}).pipe(finalize(()=>this.loadingEvolucao=false)).subscribe({next:r=>this.evolucao=r,error:e=>this.erroEvolucao=e.error?.message||'Não foi possível consultar a evolução.'});}
 paginar(e:{pageIndex:number;pageSize:number}){this.pagina=e.pageIndex+1;this.tamanho=e.pageSize;this.carregar();}
 iniciarAvaliacao(p:PosicaoCusto){if(this.saving||this.alterados||this.data!==this.hoje)return;this.avaliando=p;this.custo='';this.motivo='';this.alterarAvaliacao();this.success='';}
 alterarAvaliacao(){this.chave=crypto.randomUUID();}
 avaliar(){if(!this.avaliando||!this.custoValido||this.saving)return;this.saving=true;this.error='';this.operacao=this.service.avaliar(this.avaliando,centavos(this.custo)!,this.motivo,this.chave).pipe(finalize(()=>this.saving=false)).subscribe({next:()=>{this.avaliando=null;this.success='Avaliação registrada com justificativa. Posições anteriores foram preservadas.';this.carregar();this.carregarEvolucao();},error:e=>this.error=e.error?.message||'Não foi possível avaliar. Dados mantidos; atualize a posição se houver conflito.'});}
 exportar(tipo:'custos'|'custos/evolucao'){if(this.exporting||this.saving||tipo==='custos'&&(!this.posicao||this.alterados)||tipo!=='custos'&&(!this.evolucao||this.evolucaoAlterada))return;this.exporting=true;const f:Record<string,string>=tipo==='custos'?{data:this.posicao!.filtros.data,q:this.posicao!.filtros.q}:{inicio:this.evolucao!.filtros.inicio,fim:this.evolucao!.filtros.fim,q:this.evolucao!.filtros.q};this.download=this.service.csv(tipo,f).pipe(finalize(()=>this.exporting=false)).subscribe({next:b=>{const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=tipo==='custos'?'custos.csv':'evolucao-custos.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);},error:async e=>{let msg='Falha ao exportar.';if(e.error instanceof Blob){try{msg=JSON.parse(await e.error.text()).message||msg;}catch{}}if(!this.encerrado)this.error=msg;}});}
 ngOnDestroy(){this.consultaMargem?.unsubscribe();this.encerrado=true;this.consulta?.unsubscribe();this.historico?.unsubscribe();this.operacao?.unsubscribe();this.download?.unsubscribe();this.consultaTrilha?.unsubscribe();}
}
