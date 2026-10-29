import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { finalize, takeUntil, timeout } from 'rxjs/operators';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';
import { RelatoriosService, RelatorioEstoque } from 'src/app/shared/services/relatorios.service';
@Component({selector:'app-relatorios',templateUrl:'./relatorios.component.html',styleUrl:'./relatorios.component.scss'})
export class RelatoriosComponent implements OnInit, OnDestroy {
 relatorio:RelatorioEstoque|null=null; categorias:Categoria[]=[];
 loading=false;exporting=false;error='';exportError='';opcoesError=false;pagina=1;tamanho=10;
 private consulta?:Subscription;private download?:Subscription;private destroy=new Subject<void>();
 private inicial={q:'',estado:'ativos',estoque:'todos',vencimento:'todos',categoria:'',ordem:'nome'};
 filtros=this.fb.nonNullable.group({...this.inicial});
 private aplicados={...this.inicial};
 constructor(private fb:FormBuilder,private service:RelatoriosService,private categoriaService:CategoriaService){}
 get filtrosAlterados(){return JSON.stringify(this.filtros.getRawValue())!==JSON.stringify(this.aplicados);}
 ngOnInit(){this.categoriaService.getCategorias().pipe(timeout(15000),takeUntil(this.destroy)).subscribe({next:c=>this.categorias=c,error:()=>this.opcoesError=true});this.carregar();}
 aplicar(){this.aplicados={...this.filtros.getRawValue()};this.pagina=1;this.carregar();}
 limpar(){this.filtros.reset({...this.inicial});this.aplicar();}
 paginar(e:{pageIndex:number;pageSize:number}){this.pagina=e.pageIndex+1;this.tamanho=e.pageSize;this.carregar();}
 carregar(){this.consulta?.unsubscribe();this.loading=true;this.error='';this.exportError='';this.relatorio=null;this.consulta=this.service.estoque({...this.aplicados,direcao:this.aplicados.ordem==='recentes'?'desc':'asc',pagina:this.pagina,tamanho:this.tamanho}).pipe(finalize(()=>this.loading=false)).subscribe({next:d=>{this.relatorio=d;this.pagina=d.pagina;},error:e=>this.error=e.error?.message||'Não foi possível gerar o relatório. Tente novamente.'});}
 exportar(){if(this.exporting||this.loading||!this.relatorio||this.filtrosAlterados)return;this.exporting=true;this.exportError='';this.download=this.service.csv({...this.aplicados,direcao:this.aplicados.ordem==='recentes'?'desc':'asc'}).pipe(finalize(()=>this.exporting=false)).subscribe({next:blob=>{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='estoque.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},error:async e=>{let message='Não foi possível exportar. Tente novamente.';if(e.error instanceof Blob){try{message=JSON.parse(await e.error.text()).message||message;}catch{}}this.exportError=message;}});}
 ngOnDestroy(){this.consulta?.unsubscribe();this.download?.unsubscribe();this.destroy.next();this.destroy.complete();}
}
