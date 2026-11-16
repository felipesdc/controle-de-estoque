import { Component,OnDestroy,OnInit } from '@angular/core';
import { FormBuilder,Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Observable,Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { RelatoriosService,RelatorioConsumo,RelatorioCompras } from 'src/app/shared/services/relatorios.service';
function periodo(){
 const parts=new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const get=(k:string)=>parts.find(p=>p.type===k)!.value;
 const fim=`${get('year')}-${get('month')}-${get('day')}`,start=new Date(fim+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-29);
 return {inicio:start.toISOString().slice(0,10),fim};
}
@Component({standalone:false,selector:'app-relatorios-periodo',templateUrl:'./relatorios-periodo.component.html',styleUrls:['./relatorios.component.scss']})
export class RelatoriosPeriodoComponent implements OnInit,OnDestroy {
 tipo:'consumo'|'compras';consumo:RelatorioConsumo|null=null;compras:RelatorioCompras|null=null;
 loading=false;exporting=false;error='';exportError='';pagina=1;tamanho=10;
 private inicial={...periodo(),q:'',estado:'pendentes'};private aplicados={...this.inicial};
 filtros=this.fb.nonNullable.group({inicio:[this.inicial.inicio,Validators.required],fim:[this.inicial.fim,Validators.required],q:['',Validators.maxLength(100)],estado:['pendentes']});
 private consulta?:Subscription;private download?:Subscription;private encerrado=false;
 constructor(private fb:FormBuilder,private service:RelatoriosService,private route:ActivatedRoute){this.tipo=this.route.snapshot.data['tipo'];}
 get alterados(){return JSON.stringify(this.filtros.getRawValue())!==JSON.stringify(this.aplicados);}
 get relatorio(){return this.consumo||this.compras;}
 get periodoValido(){return this.filtros.valid&&this.filtros.controls.inicio.value<=this.filtros.controls.fim.value;}
 ngOnInit(){this.carregar();}
 aplicar(){if(!this.periodoValido)return;this.aplicados={...this.filtros.getRawValue()};this.pagina=1;this.carregar();}
 limpar(){this.inicial={...periodo(),q:'',estado:'pendentes'};this.filtros.reset(this.inicial);this.aplicar();}
 paginar(e:{pageIndex:number;pageSize:number}){if(this.alterados)return;this.pagina=e.pageIndex+1;this.tamanho=e.pageSize;this.carregar();}
 private params(){return {inicio:this.aplicados.inicio,fim:this.aplicados.fim,q:this.aplicados.q,...(this.tipo==='compras'?{estado:this.aplicados.estado}:{})};}
 carregar(){
  this.consulta?.unsubscribe();this.loading=true;this.error='';this.exportError='';this.consumo=null;this.compras=null;
  const f={...this.params(),pagina:this.pagina,tamanho:this.tamanho};
  const request:Observable<RelatorioConsumo|RelatorioCompras>=this.tipo==='consumo'?this.service.consumo(f):this.service.compras(f);
  this.consulta=request.pipe(finalize(()=>this.loading=false)).subscribe({next:r=>{if(r.tipo==='consumo')this.consumo=r;else this.compras=r;this.pagina=r.pagina;},error:e=>this.error=e.error?.message||'Não foi possível gerar o relatório.'});
 }
 exportar(){if(this.exporting||this.loading||!this.relatorio||this.alterados||this.relatorio.total>10000)return;
  this.exporting=true;this.exportError='';this.download=this.service.csvPeriodo(this.tipo,this.params()).pipe(finalize(()=>this.exporting=false)).subscribe({next:blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=this.tipo+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:async e=>{let message='Não foi possível exportar. Tente novamente.';if(e.error instanceof Blob){try{message=JSON.parse(await e.error.text()).message||message;}catch{}}if(!this.encerrado)this.exportError=message;}});
 }
 rotulo(estado:string){return ({rascunho:'Rascunho',confirmado:'Confirmado',parcial:'Parcial',recebido:'Recebido',encerrado:'Saldo encerrado',cancelado:'Cancelado'} as Record<string,string>)[estado]||estado;}
 dataPedido(value:string){const raw=String(value),normalized=/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)?raw:raw+(raw.length===10?'T00:00:00Z':'Z');const d=new Date(normalized);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d):'Data não disponível';}
 ngOnDestroy(){this.encerrado=true;this.consulta?.unsubscribe();this.download?.unsubscribe();}
}
