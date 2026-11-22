import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
export interface ItemCompra { lotes_devolviveis:{lote_id:number|null;codigo:string|null;validade:string|null;quantidade:number}[]; quantidade_recebida:number; quantidade_pendente:number; quantidade_devolvida:number; quantidade_devolvivel:number; quantidade_encerrada:number; item_pedido_id:number; item_pedido_produto_id:number; item_pedido_quantidade:number; item_preco_centavos:number|null; item_total_centavos:number|null; produto:string; unidade:string|null; movimento_id?:number; movimento_estornado_por?:number; }
export interface CustosAquisicao {frete_centavos:number;despesas_centavos:number;desconto_centavos:number;regime:string;ibs_cbs_regular:boolean;referencia_documento:string;tributos:{codigo:string;tratamento:string;valor_centavos:number}[];}
export interface CreditoDevolucao {credito_id:number;valor_centavos:number;documento:string;motivo:string;data:string;}
export interface EntregaCompra { custos?:CustosAquisicao & {base_reais:string;custo_reais:string;criterio:string};creditos?:CreditoDevolucao[]; entrega_id:number;tipo:string;documento:string;motivo:string;data:string;usuario:string;itens:{entrega_item_id:number;produto:string;lote_codigo:string|null;lote_validade:string|null;quantidade_milesimos:number;movimento_id:number}[]; }
export interface Compra { entregas:EntregaCompra[]; pedido_id:number; pedido_fornecedor_id:number; pedido_data:string; pedido_fluxo:string|null; pedido_versao:number; pedido_observacao:string; pedido_total_centavos:number|null; pedido_total:number; fornecedor:string; itens:ItemCompra[]; eventos:{evento_id:number;estado:string;data:string;usuario:string;observacao:string}[]; historico_legado:{historico_id:number;estado:string;historico_data:string;historico_observacao:string}[]; }
export interface CompraInput { fornecedor:number; observacao:string; versao?:number; itens:{produto:number;quantidade:number;preco_centavos:number}[]; }
@Injectable({providedIn:'root'})
export class ComprasService {
 private url=environment.apiurl+'/compras/pedidos';
 constructor(private http:HttpClient){}
 listar(filtros:Record<string,string|number>){let params=new HttpParams();for(const [k,v] of Object.entries(filtros))params=params.set(k,v);return this.http.get<{itens:Compra[];total:number;pagina:number;tamanho:number}>(this.url,{params});}
 obter(id:number){return this.http.get<Compra>(`${this.url}/${id}`);}
 salvar(body:CompraInput,key:string,id?:number){return id?this.http.patch<Compra>(`${this.url}/${id}`,body):this.http.post<Compra>(this.url,body,{headers:{'Idempotency-Key':key}});}
 credito(pedido:number,entrega:number,body:{valor_centavos:number;documento:string;motivo:string},key:string){return this.http.post(`${this.url}/${pedido}/devolucoes/${entrega}/creditos`,body,{headers:{'Idempotency-Key':key}});}
 transicao(p:Compra,acao:string,motivo:string,key:string,entrega?:{custos?:CustosAquisicao;documento:string;itens:{item:number;quantidade:number;lote?:{codigo:string;validade:string|null};lote_id?:number|null}[]}){return this.http.post<Compra>(`${this.url}/${p.pedido_id}/${acao}`,{versao:p.pedido_versao,...(['cancelar','encerrar','devolver'].includes(acao)?{motivo}:{}),...entrega},{headers:{'Idempotency-Key':key}});}
}
