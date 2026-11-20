import { ChangeDetectionStrategy } from '@angular/core';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/shared/services/auth.service';
interface Item {produto_id:number;produto_descricao:string;unidade:string|null;saldo:number;produto_estoque_minimo:number;encomendado:number;sugestao:number;pedidos_unidade_divergente:number;}
@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,selector:'app-reposicao',templateUrl:'./reposicao.component.html',styleUrls:['../pedidos/pedidos.component.scss']})
export class ReposicaoComponent implements OnInit,OnDestroy {
 itens:Item[]=[]; selecionados=new Set<number>(); q='';pagina=1;total=0;loading=false;error='';gerado='';private consulta?:Subscription;
 constructor(private http:HttpClient,private router:Router,public auth:AuthService){}
 get podeAlterar(){return this.auth.isAdmin()||this.auth.isGerente();}
 ngOnInit(){this.carregar();} ngOnDestroy(){this.consulta?.unsubscribe();}
 carregar(){this.consulta?.unsubscribe();this.loading=true;this.error='';this.itens=[];this.total=0;this.selecionados.clear();this.consulta=this.http.get<{itens:Item[];total:number;pagina:number;gerado_em:string}>(environment.apiurl+'/compras/reposicao',{params:new HttpParams().set('q',this.q).set('pagina',this.pagina)}).pipe(timeout(15000),finalize(()=>this.loading=false)).subscribe({next:r=>{this.itens=r.itens;this.total=r.total;this.pagina=r.pagina;this.gerado=r.gerado_em;},error:e=>this.error=e.error?.message||'Não foi possível consultar a reposição.'});}
 buscar(){this.pagina=1;this.carregar();}
 selecionar(id:number,checked:boolean){checked?this.selecionados.add(id):this.selecionados.delete(id);}
 preparar(){const itens=this.itens.filter(p=>this.selecionados.has(p.produto_id)&&p.sugestao>0).map(p=>({produto:p.produto_id,quantidade:p.sugestao}));if(itens.length&&this.podeAlterar)this.router.navigate(['/home/pedidos'],{state:{reposicao:itens}});}
}
