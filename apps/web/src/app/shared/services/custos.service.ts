import { Injectable } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export interface PosicaoCusto {produto_id:number;produto:string;codigo_atual:string|null;ativo_atual:boolean;unidade:string|null;saldo:number;custo_medio_reais:string|null;valor_reais:string|null;custo_conhecido:boolean;evento_id:number;registrado_em:string;ultima_origem:string;}
export interface Custos {itens:PosicaoCusto[];total:number;pagina:number;tamanho:number;paginas:number;gerado_em:string;cobertura_desde:string;filtros:{data:string;q:string};resumo:{produtos:number;com_custo:number;sem_custo:number;valor_conhecido_reais:string;avaliacao_completa:boolean};}
export interface HistoricoCusto {produto_id:number;produto:string;itens:{evento_id:number;data:string;natureza:string;saldo:number;unidade:string|null;valor_reais:string|null;valor_movimento_reais:string|null;custo_medio_reais:string|null;usuario:string|null;motivo:string;movimento_id:number|null}[];total:number;pagina:number;tamanho:number;}
export interface DiaCusto {dia:string;produtos:number;sem_custo:number;valor_conhecido_reais:string;avaliacao_completa:boolean;}
export interface EvolucaoCusto {itens:DiaCusto[];total:number;gerado_em:string;cobertura_desde:string;filtros:{inicio:string;fim:string;q:string};}
@Injectable({providedIn:'root'})
export class CustosService {
 constructor(private http:HttpClient){}
 private params(f:Record<string,string|number>){let p=new HttpParams();for(const [k,v] of Object.entries(f))p=p.set(k,v);return p;}
 posicao(f:Record<string,string|number>){return this.http.get<Custos>(environment.apiurl+'/relatorios/custos',{params:this.params(f)}).pipe(timeout(15000));}
 evolucao(f:Record<string,string|number>){return this.http.get<EvolucaoCusto>(environment.apiurl+'/relatorios/custos/evolucao',{params:this.params(f)}).pipe(timeout(30000));}
 csv(tipo:'custos'|'custos/evolucao',f:Record<string,string|number>){return this.http.get(environment.apiurl+'/relatorios/'+tipo+'.csv',{params:this.params(f),responseType:'blob'}).pipe(timeout(30000));}
 margem(produto:number){return this.http.get<{produto_id:number;venda_centavos:number|null;custo_medio_reais:string|null;margem_bruta_percentual:string|null;observacao:string}>(environment.apiurl+`/produto/${produto}/margem`).pipe(timeout(15000));}
 historico(produto:number,pagina:number){return this.http.get<HistoricoCusto>(environment.apiurl+`/produto/${produto}/custos/historico`,{params:this.params({pagina,tamanho:10})}).pipe(timeout(15000));}
 avaliar(p:PosicaoCusto,unitario:number,motivo:string,chave:string){return this.http.post(environment.apiurl+`/produto/${p.produto_id}/custo-base`,{evento_id:p.evento_id,unitario_centavos:unitario,motivo},{headers:{'Idempotency-Key':chave}}).pipe(timeout(15000));}
}
