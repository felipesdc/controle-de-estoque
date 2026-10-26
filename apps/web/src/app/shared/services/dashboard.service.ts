import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export interface Dashboard {
  atualizado_em: string;
  criterios: { data_referencia: string; fuso: string; estoque_baixo_abaixo_de: number; vencimento_dias: number; vencimento_ate: string };
  totais: { produtos_ativos: number; estoque_baixo: number; vencem_em_breve: number; vencidos: number };
  baixo_estoque: { produto_id: number; produto_descricao: string; quantidade: number; unidade: string | null }[];
  vencimentos: { produto_id: number; produto_descricao: string; quantidade: number; validade: string; situacao: 'vencido' | 'hoje' | 'em_breve' }[];
  movimentos_recentes: { movimento_id: number; movimento_produto_id: number; produto: string | null; movimento_tipo: string; movimento_quantidade: number; movimento_data: string | null; movimento_estorno_de: number | null; responsavel: string | null }[];
}
@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private http: HttpClient) {}
  getDashboard(): Observable<Dashboard> { return this.http.get<Dashboard>(`${environment.apiurl}/dashboard`).pipe(timeout(15000)); }
}
