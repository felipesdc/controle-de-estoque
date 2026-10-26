import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { EstadoPedido } from '../models/estado-pedido.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class EstadoPedidoService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getEstadosPedido(): Observable<EstadoPedido[]> {
    return this.http.get<EstadoPedido[]>(`${environment.apiurl}/estado-pedido`);
  }

  getEstadoPedido(estado_pedido_id: number): Observable<EstadoPedido> {
    return this.http.get<EstadoPedido>(
      `${environment.apiurl}/estado-pedido/${estado_pedido_id}`
    );
  }

  createNewEstadoPedido(estadoPedido: EstadoPedido): Observable<EstadoPedido> {
    return this.http.post<EstadoPedido>(
      `${environment.apiurl}/estado-pedido`,
      estadoPedido
    );
  }

  updateExistingEstadoPedido(
    estadoPedido: EstadoPedido,
    estado_pedido_id: number
  ): Observable<EstadoPedido> {
    return this.http.put<EstadoPedido>(
      `${environment.apiurl}/estado-pedido/${estado_pedido_id}`,
      estadoPedido
    );
  }

  deleteExistingEstadoPedido(estado_pedido_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/estado-pedido/${estado_pedido_id}`
    );
  }
}
