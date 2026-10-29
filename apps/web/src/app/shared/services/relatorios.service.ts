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
 estoque(f:Record<string,string|number>){return this.http.get<RelatorioEstoque>(environment.apiurl+'/relatorios/estoque',{params:this.params(f)}).pipe(timeout(15000));}
 csv(f:Record<string,string|number>){return this.http.get(environment.apiurl+'/relatorios/estoque.csv',{params:this.params(f),responseType:'blob'}).pipe(timeout(30000));}
}
