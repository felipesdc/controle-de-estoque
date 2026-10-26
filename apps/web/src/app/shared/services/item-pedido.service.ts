import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { ItemPedido } from '../models/item-pedido.model';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ItemPedidoService {
  constructor(private snack: MatSnackBar, private http: HttpClient) {}

  showMessage(msg: string, css: string): void {
    this.snack.open(msg, 'X', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: [css],
    });
  }

  getItensPedido(): Observable<ItemPedido[]> {
    return this.http.get<ItemPedido[]>(`${environment.apiurl}/item-pedido`);
  }

  getItemPedido(item_pedido_id: number): Observable<ItemPedido> {
    return this.http.get<ItemPedido>(
      `${environment.apiurl}/item-pedido/${item_pedido_id}`
    );
  }

  createNewItemPedido(itemPedido: ItemPedido): Observable<ItemPedido> {
    return this.http.post<ItemPedido>(
      `${environment.apiurl}/item-pedido`,
      itemPedido
    );
  }

  updateExistingItemPedido(
    itemPedido: ItemPedido,
    item_pedido_id: number
  ): Observable<ItemPedido> {
    return this.http.put<ItemPedido>(
      `${environment.apiurl}/item-pedido/${item_pedido_id}`,
      itemPedido
    );
  }

  deleteExistingItemPedido(item_pedido_id: number): Observable<void> {
    return this.http.delete<void>(
      `${environment.apiurl}/item-pedido/${item_pedido_id}`
    );
  }
}
