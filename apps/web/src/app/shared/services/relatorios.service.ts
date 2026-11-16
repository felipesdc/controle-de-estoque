import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { Catalogo } from '../models/catalogo.model';
import { environment } from 'src/environments/environment';
export interface RelatorioEstoque extends Catalogo {
 gerado_em:string;
 resumo:{produtos:number;ativos:number;inativos:number;zerados:number;baixos:number;vencidos:number;vencem_em_breve:number};
}
@Injectable({providedIn:'root'})
export class RelatoriosService {
 constructor(private http:HttpClient){}
 private params(f:Record<string,string|number>){let params=new HttpParams();for(const [k,v] of Object.entries(f))if(v!=='')params=params.set(k,v);return params;}
 consumo(f:Record<string,string|number>){return this.http.get<RelatorioConsumo>(environment.apiurl+'/relatorios/consumo',{params:this.params(f)}).pipe(timeout(15000));}
 compras(f:Record<string,string|number>){return this.http.get<RelatorioCompras>(environment.apiurl+'/relatorios/compras',{params:this.params(f)}).pipe(timeout(15000));}
 csvPeriodo(tipo:'consumo'|'compras',f:Record<string,string|number>){return this.http.get(`${environment.apiurl}/relatorios/${tipo}.csv`,{params:this.params(f),responseType:'blob'}).pipe(timeout(30000));}
 estoque(f:Record<string,string|number>){return this.http.get<RelatorioEstoque>(environment.apiurl+'/relatorios/estoque',{params:this.params(f)}).pipe(timeout(15000));}
 csv(f:Record<string,string|number>){return this.http.get(environment.apiurl+'/relatorios/estoque.csv',{params:this.params(f),responseType:'blob'}).pipe(timeout(30000));}
}

export interface SaidaConsumo {produto_id:number;produto:string;codigo_atual:string|null;unidade_id:number|null;unidade:string|null;unidade_registrada:boolean;operacoes:number;quantidade:number|null;ultimo_dia:string;}
export interface LinhaCompraRelatorio {pedido_id:number;pedido_data:string;pedido_fluxo:string;fornecedor:string|null;item_id:number;produto_id:number;produto:string;unidade:string|null;pedida:number;recebida:number;devolvida:number;pendente:number;encerrada:number;}
interface RelatorioPeriodo {total:number;pagina:number;tamanho:number;paginas:number;gerado_em:string;filtros:{inicio:string;fim:string;q:string;estado?:string};}
export interface RelatorioConsumo extends RelatorioPeriodo {tipo:'consumo';itens:SaidaConsumo[];resumo:{linhas:number;operacoes:number;produtos:number;sem_unidade_historica:number};}
export interface RelatorioCompras extends RelatorioPeriodo {tipo:'compras';itens:LinhaCompraRelatorio[];resumo:{linhas:number;pedidos:number;itens_pendentes:number;pedidos_pendentes:number};}
