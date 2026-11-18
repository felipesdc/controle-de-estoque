import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { InventariosService, Inventario, InventarioResumo, InventarioItem, InventarioLote } from 'src/app/shared/services/inventarios.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { ProdutoCatalogo } from 'src/app/shared/models/catalogo.model';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({standalone:false,selector:'app-inventarios',templateUrl:'./inventarios.component.html',styleUrls:['./inventarios.component.scss','./inventarios-lotes.scss']})
export class InventariosComponent implements OnInit,OnDestroy {
 lista:InventarioResumo[]=[];total=0;pagina=1;estado='';loading=false;saving=false;buscando=false;error='';success='';sujo=false;novo=false;titulo='';q='';produtos:ProdutoCatalogo[]=[];totalBusca=0;
 selecionados=new Map<number,string>();detalhe:Inventario|null=null;acao='';motivo='';
 private consulta?:Subscription;private busca?:Subscription;private operacao?:Subscription;private chaveCriacao=crypto.randomUUID();private chaveAcao=crypto.randomUUID();
 constructor(public auth:AuthService,private service:InventariosService,private catalogo:ProdutoService,private route:ActivatedRoute){}
 registrandoProduto:number|null=null;codigoLote='';validadeLote='';motivoLote='';private chaveLote=crypto.randomUUID();
 iniciarLote(i:InventarioItem){if(this.sujo||this.saving)return;this.registrandoProduto=i.produto_id;this.codigoLote='';this.validadeLote='';this.motivoLote='';this.alterarRegistroLote();}
 alterarRegistroLote(){this.chaveLote=crypto.randomUUID();}
 registrarLote(){if(!this.detalhe||!this.registrandoProduto||this.sujo||this.saving||!this.codigoLote.trim()||this.motivoLote.trim().length<3)return;this.executar(this.service.registrarLote(this.detalhe,this.registrandoProduto,this.codigoLote,this.validadeLote,this.motivoLote,this.chaveLote),'Lote identificado, ainda sem alteração de saldo. Conte a quantidade física e revise antes de aprovar.');}
 get autorizado(){return this.auth.isAdmin()||this.auth.isGerente();}
 get finalizado(){return !!this.detalhe&&['aprovado','cancelado'].includes(this.detalhe.estado);}
 get desatualizado(){return !this.finalizado&&!!this.detalhe?.itens.some(i=>i.referencia_alterada);}
 filtrosLote:Record<number,string>={};paginasLote:Record<number,number>={};
 private quantidadeValida(n:number|null){return n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9&&Math.abs(n*1000-Math.round(n*1000))<.00001);}
 totalContado(i:InventarioItem){return this.detalhe?.modo!=='lotes'?i.contado:i.lotes.some(l=>l.contado===null)?null:i.lotes.reduce((sum,l)=>sum+Math.round((l.contado??0)*1000),0)/1000;}
 get contagemValida(){return !!this.detalhe&&this.detalhe.itens.every(i=>this.detalhe!.modo==='lotes'?i.lotes.every(l=>this.quantidadeValida(l.contado))&&i.lotes.reduce((sum,l)=>sum+Math.round((l.contado??0)*1000),0)<=1e12:this.quantidadeValida(i.contado));}
 get completo(){return this.contagemValida&&this.detalhe!.itens.every(i=>this.totalContado(i)!==null);}
 get progresso(){const rows=this.detalhe?.modo==='lotes'?this.detalhe.itens.reduce<InventarioLote[]>((all,i)=>all.concat(i.lotes),[]):this.detalhe?.itens||[];return {total:rows.length,contadas:rows.filter(i=>i.contado!==null).length,divergencias:rows.filter(i=>i.contado!==null&&Math.round(i.contado*1000)!==Math.round(i.saldo*1000)).length};}
 lotesFiltrados(i:InventarioItem){const q=(this.filtrosLote[i.produto_id]||'').trim().toLocaleLowerCase('pt-BR');return i.lotes.filter(l=>(l.codigo||'sem lote identificado').toLocaleLowerCase('pt-BR').includes(q));}
 lotesVisiveis(i:InventarioItem){const page=this.paginasLote[i.produto_id]||1;return this.lotesFiltrados(i).slice((page-1)*10,page*10);}
 filtrarLotes(i:InventarioItem){this.paginasLote[i.produto_id]=1;}
 paginarLotes(i:InventarioItem,delta:number){this.paginasLote[i.produto_id]=Math.max(1,(this.paginasLote[i.produto_id]||1)+delta);}
 trackLote(_index:number,l:InventarioLote){return l.contagem_id;}
 ngOnInit(){if(this.autorizado){this.carregar();const value=Number(this.route.snapshot.queryParamMap.get('id'));if(Number.isSafeInteger(value)&&value>0)this.abrir(value);}}
 ngOnDestroy(){this.consulta?.unsubscribe();this.busca?.unsubscribe();this.operacao?.unsubscribe();}
 evento(acao:string){return ({registro_lote:'Lote identificado na conferência',abertura:'Contagem aberta',contagem:'Quantidades salvas',revisar:'Divergências enviadas à revisão',aprovar:'Ajustes aprovados',recontar:'Contagem reiniciada',cancelar:'Inventário cancelado'} as Record<string,string>)[acao]||acao;}
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
 private executar(request:Observable<Inventario>,message:string){this.saving=true;this.error='';this.operacao=request.pipe(finalize(()=>this.saving=false)).subscribe({next:d=>{this.detalhe=d;this.registrandoProduto=null;this.paginasLote={};this.filtrosLote={};this.novo=false;this.sujo=false;this.acao='';this.success=message;this.carregar();},error:e=>{this.error=e.error?.message||'Falha na operação. Dados mantidos; tente novamente. Se houver conflito de versão, reabra os detalhes.';}});}
 reabrir(){if(!this.detalhe||this.saving)return;this.sujo=false;this.abrir(this.detalhe.inventario_id);}
}
