import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { InventariosService, Inventario, InventarioResumo } from 'src/app/shared/services/inventarios.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { ProdutoCatalogo } from 'src/app/shared/models/catalogo.model';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({standalone:false,selector:'app-inventarios',templateUrl:'./inventarios.component.html',styleUrls:['./inventarios.component.scss']})
export class InventariosComponent implements OnInit,OnDestroy {
 lista:InventarioResumo[]=[];total=0;pagina=1;estado='';loading=false;saving=false;buscando=false;error='';success='';sujo=false;novo=false;titulo='';q='';produtos:ProdutoCatalogo[]=[];totalBusca=0;
 selecionados=new Map<number,string>();detalhe:Inventario|null=null;acao='';motivo='';
 private consulta?:Subscription;private busca?:Subscription;private operacao?:Subscription;private chaveCriacao=crypto.randomUUID();private chaveAcao=crypto.randomUUID();
 constructor(public auth:AuthService,private service:InventariosService,private catalogo:ProdutoService,private route:ActivatedRoute){}
 get autorizado(){return this.auth.isAdmin()||this.auth.isGerente();}
 get finalizado(){return !!this.detalhe&&['aprovado','cancelado'].includes(this.detalhe.estado);}
 get desatualizado(){return !this.finalizado&&!!this.detalhe?.itens.some(i=>i.referencia_alterada);}
 get contagemValida(){return !!this.detalhe&&this.detalhe.itens.every(i=>i.contado===null||(typeof i.contado==='number'&&Number.isFinite(i.contado)&&i.contado>=0&&i.contado<=1e9&&Math.abs(i.contado*1000-Math.round(i.contado*1000))<.00001));}
 get completo(){return this.contagemValida&&this.detalhe!.itens.every(i=>i.contado!==null);}
 ngOnInit(){if(this.autorizado){this.carregar();const value=Number(this.route.snapshot.queryParamMap.get('id'));if(Number.isSafeInteger(value)&&value>0)this.abrir(value);}}
 ngOnDestroy(){this.consulta?.unsubscribe();this.busca?.unsubscribe();this.operacao?.unsubscribe();}
 evento(acao:string){return ({abertura:'Contagem aberta',contagem:'Quantidades salvas',revisar:'Divergências enviadas à revisão',aprovar:'Ajustes aprovados',recontar:'Contagem reiniciada',cancelar:'Inventário cancelado'} as Record<string,string>)[acao]||acao;}
 rotulo(estado:string){return ({aberto:'Em contagem',revisao:'Em revisão',aprovado:'Aprovado',cancelado:'Cancelado'} as Record<string,string>)[estado]||estado;}
 carregar(){this.consulta?.unsubscribe();this.loading=true;this.consulta=this.service.listar(this.pagina,this.estado).pipe(finalize(()=>this.loading=false)).subscribe({next:r=>{this.lista=r.itens;this.total=r.total;this.pagina=r.pagina;},error:e=>{this.lista=[];this.total=0;this.error=e.error?.message||'Não foi possível listar os inventários.';}});}
 iniciar(){if(this.saving||this.sujo)return;this.detalhe=null;this.novo=true;this.titulo='';this.q='';this.selecionados.clear();this.error='';this.success='';this.mudarCriacao();this.buscar();}
 mudarCriacao(){this.chaveCriacao=crypto.randomUUID();}
 buscar(){this.busca?.unsubscribe();this.buscando=true;this.produtos=[];this.busca=this.catalogo.getCatalogo({q:this.q,estado:'ativos',tamanho:10,pagina:1}).pipe(finalize(()=>this.buscando=false)).subscribe({next:r=>{this.produtos=r.itens;this.totalBusca=r.total;},error:()=>this.error='Não foi possível buscar produtos. Tente novamente.'});}
 selecionar(p:ProdutoCatalogo){if(this.selecionados.has(p.produto_id!))this.selecionados.delete(p.produto_id!);else if(this.selecionados.size<100)this.selecionados.set(p.produto_id!,p.produto_descricao);this.mudarCriacao();}
 remover(id:number){this.selecionados.delete(id);this.mudarCriacao();}
 criar(){if(!this.titulo.trim()||!this.selecionados.size||this.saving)return;this.executar(this.service.criar(this.titulo.trim(),[...this.selecionados.keys()],this.chaveCriacao),'Inventário aberto. Conte os produtos e salve as quantidades encontradas.');}
 abrir(id:number){if(this.saving||this.sujo)return;this.error='';this.success='';this.executar(this.service.obter(id),'');}
 alterar(){this.sujo=true;this.acao='';this.success='';}
 salvar(){if(!this.detalhe||!this.contagemValida||this.saving)return;this.executar(this.service.salvar(this.detalhe),'Contagens salvas. Nenhum saldo foi alterado.');}
 revisar(){if(!this.detalhe||this.sujo||!this.completo)return;this.executar(this.service.acao(this.detalhe,'revisar','',crypto.randomUUID()),'Contagem enviada à revisão. Confira as divergências antes de aprovar.');}
 preparar(acao:string){this.acao=acao;this.motivo='';this.chaveAcao=crypto.randomUUID();this.error='';}
 mudarMotivo(){this.chaveAcao=crypto.randomUUID();}
 confirmar(){if(!this.detalhe||this.saving||this.motivo.trim().length<3||this.motivo.length>350)return;this.executar(this.service.acao(this.detalhe,this.acao,this.motivo,this.chaveAcao),this.acao==='aprovar'?'Inventário aprovado. Ajustes e histórico gravados juntos.':this.acao==='recontar'?'Referência atualizada. Todas as quantidades precisam ser contadas novamente.':'Inventário cancelado. Nenhum ajuste de estoque foi criado.');}
 private executar(request:Observable<Inventario>,message:string){this.saving=true;this.error='';this.operacao=request.pipe(finalize(()=>this.saving=false)).subscribe({next:d=>{this.detalhe=d;this.novo=false;this.sujo=false;this.acao='';this.success=message;this.carregar();},error:e=>{this.error=e.error?.message||'Falha na operação. Dados mantidos; tente novamente. Se houver conflito de versão, reabra os detalhes.';}});}
 reabrir(){if(!this.detalhe||this.saving)return;this.sujo=false;this.abrir(this.detalhe.inventario_id);}
}
