import { Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
@Injectable()
export class PaginacaoPt extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';
  override getRangeLabel = (page: number, size: number, length: number): string => {
    if (!length || !size) return `0 de ${length}`;
    const start = page * size;
    return `${start + 1}–${Math.min(start + size, length)} de ${length}`;
  };
}
