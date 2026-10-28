import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs/operators';
import { Produto } from 'src/app/shared/models/produto.model';
import { ProdutoService } from 'src/app/shared/services/produto.service';
@Component({
  selector: 'app-produto-status-dialog',
  template: `<h1 mat-dialog-title>{{ data.produto_estado ? 'Inativar produto?' : 'Reativar produto?' }}</h1><mat-dialog-content><p><strong>{{ data.produto_descricao }}</strong></p><p>{{ data.produto_estado ? 'O item ficará fora das operações comuns. Seu saldo e histórico serão preservados.' : 'O item voltará a aparecer no catálogo ativo e poderá receber movimentações.' }}</p><p role="alert" *ngIf="error">{{ error }}</p></mat-dialog-content><mat-dialog-actions align="end"><button mat-button (click)="ref.close()" [disabled]="saving">Cancelar</button><button mat-flat-button color="primary" (click)="confirmar()" [disabled]="saving">{{ saving ? 'Aguarde…' : data.produto_estado ? 'Inativar' : 'Reativar' }}</button></mat-dialog-actions>`,
  styles: ['p { font-size: 14px; line-height: 1.7; } p[role=alert] { color: #a74337; } mat-dialog-actions { padding: 12px 24px 20px; }'],
})
export class ProdutoStatusDialogComponent {
  saving = false; error = '';
  constructor(public ref: MatDialogRef<ProdutoStatusDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: Produto, private service: ProdutoService) {}
  confirmar(): void {
    if (this.saving) return;
    this.saving = true; this.error = ''; this.ref.disableClose = true;
    this.service.patchProduto(this.data.produto_id!, { produto_estado: !this.data.produto_estado }).pipe(finalize(() => { this.saving = false; this.ref.disableClose = false; })).subscribe({ next: saved => this.ref.close(saved), error: err => this.error = err.error?.message || 'Não foi possível concluir. Tente novamente.' });
  }
}
