import { Injectable } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export interface AlertaLote {produto_id:number;produto_descricao:string;produto_codigo:string|null;lote_id:number|null;lote_codigo:string|null;origem:'lote'|'sem_lote';unidade:string|null;quantidade:number;validade:string|null;situacao:'vencido'|'hoje'|'em_breve'|'no_prazo'|'sem_validade';}
export interface AlertasLotes {itens:AlertaLote[];total:number;pagina:number;tamanho:number;paginas:number;resumo:{registros:number;produtos:number;lotes:number;sem_lote:number};gerado_em:string;filtros:{q:string;vencimento:string};criterios:{data_referencia:string;vencimento_ate:string;vencimento_dias:number;fuso:string;origem_validade:string};}
@Injectable({providedIn:'root'})
export class AlertasLotesService {
 constructor(private http:HttpClient){}
 consultar(filtros:Record<string,string|number>){let params=new HttpParams();for(const [k,v] of Object.entries(filtros))params=params.set(k,v);return this.http.get<AlertasLotes>(environment.apiurl+'/lotes/alertas',{params}).pipe(timeout(15000));}
}
