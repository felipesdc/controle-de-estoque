import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export interface InventarioLote {contagem_id:number;lote_id:number|null;codigo:string|null;validade:string|null;saldo:number;saldo_atual:number;contado:number|null;diferenca:number|null;contado_em:string|null;contado_por:number|null;movimento_id:number|null;}
export interface InventarioItem {lotes:InventarioLote[];saldo_lotes:number;produto_id:number;descricao:string;unidade:string|null;saldo:number;saldo_atual:number;contado:number|null;diferenca:number|null;referencia_alterada:boolean;movimento_id:number|null;contado_por:number|null;contado_em:string|null;}
export interface InventarioResumo {inventario_id:number;titulo:string;modo:'produto'|'lotes';estado:string;versao:number;criado_em:string;criador:string;produtos:number;}
export interface Inventario extends InventarioResumo {motivo:string|null;finalizado_em:string|null;finalizador:string|null;itens:InventarioItem[];eventos:{evento_id:number;acao:string;data:string;usuario:string;conteudo:{motivo?:string;produto?:number;codigo?:string;validade?:string|null;produtos?:number[];alteracoes_milesimos?:{produto:number;lote_id?:number|null;codigo?:string|null;antes:number|null;depois:number|null}[];ajustes?:{produto:number;lote_id:number|null;codigo:string|null;diferenca_milesimos:number;movimento_id:number}[];referencia_lotes_anterior?:{produto_id:number;lote_id:number|null;codigo:string|null;validade:string|null;saldo_milesimos:number;contado_milesimos:number|null}[];referencia_anterior?:{produto_id:number;descricao:string;unidade:string|null;saldo_milesimos:number;contado_milesimos:number|null}[]}}[];}
@Injectable({providedIn:'root'})
export class InventariosService {
 private url=environment.apiurl+'/inventarios';
 constructor(private http:HttpClient){}
 listar(pagina:number,estado:string){return this.http.get<{itens:InventarioResumo[];total:number;pagina:number;tamanho:number}>(this.url,{params:new HttpParams().set('pagina',pagina).set('estado',estado)}).pipe(timeout(15000));}
 obter(id:number){return this.http.get<Inventario>(`${this.url}/${id}`).pipe(timeout(15000));}
 criar(titulo:string,produtos:number[],chave:string){return this.http.post<Inventario>(this.url,{titulo,produtos,modo:'lotes'},{headers:{'Idempotency-Key':chave}}).pipe(timeout(15000));}
 salvar(d:Inventario){return this.http.patch<Inventario>(`${this.url}/${d.inventario_id}`,{versao:d.versao,itens:d.modo==='lotes'?d.itens.reduce<{produto:number;lote_id:number|null;quantidade:number|null}[]>((all,i)=>all.concat(i.lotes.map(l=>({produto:i.produto_id,lote_id:l.lote_id,quantidade:l.contado}))),[]):d.itens.map(i=>({produto:i.produto_id,quantidade:i.contado}))}).pipe(timeout(15000));}
 registrarLote(d:Inventario,produto:number,codigo:string,validade:string,motivo:string,chave:string){return this.http.post<Inventario>(`${this.url}/${d.inventario_id}/lotes`,{versao:d.versao,produto,lote:{codigo,validade:validade||null},motivo},{headers:{'Idempotency-Key':chave}}).pipe(timeout(15000));}
 acao(d:Inventario,acao:string,motivo:string,chave:string){return this.http.post<Inventario>(`${this.url}/${d.inventario_id}/${acao}`,{versao:d.versao,...(acao==='revisar'?{}:{motivo})},{headers:{'Idempotency-Key':chave}}).pipe(timeout(15000));}
}
