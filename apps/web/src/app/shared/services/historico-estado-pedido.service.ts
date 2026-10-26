import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { HistoricoEstadoPedido } from '../models/historico-estado-pedido.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HistoricoEstadoPedidoService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getHistoricosEstadoPedido(): Observable<HistoricoEstadoPedido[]> {
    return this.http.get<HistoricoEstadoPedido[]>(
      `${environment.apiurl}/historico-estado-pedido`
    );
  }

  getHistoricoEstadoPedido(
    historico_id: number
  ): Observable<HistoricoEstadoPedido> {
    return this.http.get<HistoricoEstadoPedido>(
      `${environment.apiurl}/historico-estado-pedido/${historico_id}`
    );
  }

  createNewHistoricoEstadoPedido(
    historicoEstadoPedido: HistoricoEstadoPedido
  ): Observable<HistoricoEstadoPedido> {
    return this.http.post<HistoricoEstadoPedido>(
      `${environment.apiurl}/historico-estado-pedido`,
      historicoEstadoPedido
    );
  }

  updateExistingHistoricoEstadoPedido(
    historicoEstadoPedido: HistoricoEstadoPedido,
    historico_id: number
  ): Observable<HistoricoEstadoPedido> {
    return this.http.put<HistoricoEstadoPedido>(
      `${environment.apiurl}/historico-estado-pedido/${historico_id}`,
      historicoEstadoPedido
    );
  }

  deleteExistingHistoricoEstadoPedido(historico_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/historico-estado-pedido/${historico_id}`
    );
  }
}
