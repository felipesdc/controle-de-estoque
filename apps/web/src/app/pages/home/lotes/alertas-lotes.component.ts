import { ChangeDetectionStrategy } from '@angular/core';
import { Component,OnInit,OnDestroy } from '@angular/core';
import { ActivatedRoute,Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AlertasLotesService,AlertasLotes } from 'src/app/shared/services/alertas-lotes.service';
@Component({ changeDetection: ChangeDetectionStrategy.Eager,standalone:false,selector:'app-alertas-lotes',templateUrl:'./alertas-lotes.component.html',styleUrls:['../relatorios/relatorios.component.scss']})
export class AlertasLotesComponent implements OnInit,OnDestroy {
 dados:AlertasLotes|null=null;loading=false;error='';q='';vencimento='atencao';pagina=1;tamanho=10;
 private aplicados={q:'',vencimento:'atencao'};private consulta?:Subscription;private parametros?:Subscription;
 constructor(private service:AlertasLotesService,private route:ActivatedRoute,private router:Router){}
 get alterados(){return this.q!==this.aplicados.q||this.vencimento!==this.aplicados.vencimento;}
 ngOnInit(){this.parametros=this.route.queryParamMap.subscribe(p=>{this.q=p.get('q')||'';this.vencimento=p.get('vencimento')||'atencao';this.pagina=Number(p.get('pagina')||1);this.tamanho=Number(p.get('tamanho')||10);this.aplicados={q:this.q,vencimento:this.vencimento};this.carregar();});}
 aplicar(){this.navegar(1,this.tamanho);}
 limpar(){this.q='';this.vencimento='atencao';this.navegar(1,10);}
 paginar(e:{pageIndex:number;pageSize:number}){if(this.alterados)return;this.navegar(e.pageIndex+1,e.pageSize);}
 private navegar(pagina:number,tamanho:number){this.router.navigate([],{relativeTo:this.route,queryParams:{q:this.q||null,vencimento:this.vencimento,pagina,tamanho}}).then(changed=>{if(!changed)this.carregar();});}
 carregar(){this.consulta?.unsubscribe();this.loading=true;this.error='';this.dados=null;this.consulta=this.service.consultar({...this.aplicados,pagina:this.pagina,tamanho:this.tamanho}).pipe(finalize(()=>this.loading=false)).subscribe({next:d=>{this.dados=d;this.pagina=d.pagina;this.tamanho=d.tamanho;},error:e=>this.error=e.error?.message||'Não foi possível carregar os alertas.'});}
 rotulo(s:string){return ({vencido:'Vencido',hoje:'Vence hoje',em_breve:'Vence em até 30 dias',no_prazo:'Após 30 dias',sem_validade:'Validade não conhecida'} as Record<string,string>)[s]||s;}
 ngOnDestroy(){this.consulta?.unsubscribe();this.parametros?.unsubscribe();}
}
