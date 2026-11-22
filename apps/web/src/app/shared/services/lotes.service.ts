import { Injectable } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export interface Lote {lote_id:number;codigo:string;validade:string|null;unidade:string|null;saldo_milesimos:number;}
export interface SugestaoRetirada {lote:Lote|null;motivo:'produto_inativo'|'vencimento_mais_proximo'|'sem_lote_elegivel';avisos:{vencidos:number;sem_validade:number;unidade_incompativel:number};criterio:string;data_referencia:string;fuso:string;confirmacao_obrigatoria:boolean;}
export interface ConsultaLotes {retirada?:SugestaoRetirada;produto_id:number;produto:string;unidade:string|null;saldo:number;identificado:number;sem_lote:number;itens:Lote[];total:number;pagina:number;tamanho:number;data_referencia:string;}
export interface EscolhaLote {id:number|null;codigo:string|null;validade:string|null;saldo:number;pronto:boolean;}
@Injectable({providedIn:'root'})
export class LotesService {
 constructor(private http:HttpClient){}
 consultar(id:number,filtros:Record<string,string|number>){let params=new HttpParams();for(const [k,v] of Object.entries(filtros))params=params.set(k,v);return this.http.get<ConsultaLotes>(`${environment.apiurl}/produto/${id}/lotes`,{params}).pipe(timeout(15000));}
}
