import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { Pedido } from '../models/pedido.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PedidoService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getPedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${environment.apiurl}/pedido`);
  }

  getPedido(pedido_id: number): Observable<Pedido> {
    return this.http.get<Pedido>(`${environment.apiurl}/pedido/${pedido_id}`);
  }

  createNewPedido(pedido: Pedido): Observable<Pedido> {
    return this.http.post<Pedido>(`${environment.apiurl}/pedido`, pedido);
  }

  updateExistingPedido(pedido: Pedido, pedido_id: number): Observable<Pedido> {
    return this.http.put<Pedido>(
      `${environment.apiurl}/pedido/${pedido_id}`,
      pedido
    );
  }

  deleteExistingPedido(pedido_id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiurl}/pedido/${pedido_id}`);
  }
}
