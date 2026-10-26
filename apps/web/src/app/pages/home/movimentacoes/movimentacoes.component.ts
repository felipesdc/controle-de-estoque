import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MovimentacaoEstoque } from 'src/app/shared/models/movimentacao-estoque.model';
import { Produto } from 'src/app/shared/models/produto.model';
import { MovimentacaoEstoqueService } from 'src/app/shared/services/movimentacao-estoque.service';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-movimentacoes',
  templateUrl: './movimentacoes.component.html',
  styleUrl: './movimentacoes.component.scss',
})
export class MovimentacoesComponent implements OnInit {
  produtos: Produto[] = [];
  movimentos: MovimentacaoEstoque[] = [];
  loading = true;
  saving = false;
  error = '';
  success = '';
  filtro = '';
  estorno: MovimentacaoEstoque | null = null;
  motivo = this.fb.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(450)]);
  private chave = crypto.randomUUID();
  private chaveEstorno = crypto.randomUUID();
  form = this.fb.group({
    movimento_produto_id: [null as number | null, Validators.required],
    movimento_tipo: ['entrada', Validators.required],
    movimento_quantidade: [null as number | null, [Validators.required, Validators.min(0.001), Validators.max(1e9)]],
    movimento_observacao: ['', Validators.maxLength(500)],
  });
  constructor(private fb: FormBuilder, private service: MovimentacaoEstoqueService, private produtoService: ProdutoService, public auth: AuthService) {}
  get podeAlterar(): boolean { return this.auth.isAdmin() || this.auth.isGerente(); }
  get produto(): Produto | undefined { return this.produtos.find(p => p.produto_id === this.form.value.movimento_produto_id); }
  get filtrados(): MovimentacaoEstoque[] {
    const busca = this.filtro.trim().toLocaleLowerCase('pt-BR');
    return this.movimentos.filter(m => `${m.movimento_produto || ''} ${m.movimento_tipo} ${m.movimento_observacao || ''} ${m.movimento_id}`.toLocaleLowerCase('pt-BR').includes(busca));
  }
  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => { this.chave = crypto.randomUUID(); this.success = ''; });
    this.carregar();
  }
  carregar(): void {
    this.loading = true;
    forkJoin({ produtos: this.produtoService.getProdutos(), movimentos: this.service.getMovimentacoesEstoque() })
      .pipe(finalize(() => this.loading = false)).subscribe({
        next: ({ produtos, movimentos }) => { this.produtos = produtos; this.movimentos = movimentos; },
        error: () => this.error = 'Não foi possível carregar os dados. Tente atualizar.',
      });
  }
  salvar(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    this.error = ''; this.success = ''; this.saving = true;
    this.form.disable({ emitEvent: false });
    this.service.createNewMovimentacaoEstoque(this.form.getRawValue() as unknown as MovimentacaoEstoque, this.chave)
      .pipe(finalize(() => { this.saving = false; this.form.enable({ emitEvent: false }); })).subscribe({
        next: () => {
          this.form.reset({ movimento_tipo: 'entrada', movimento_observacao: '' });
          this.chave = crypto.randomUUID();
          this.success = 'Movimentação registrada. O saldo foi atualizado.';
          this.carregar();
        },
        error: err => this.error = err.error?.message || 'Falha ao registrar. Você pode tentar novamente.',
      });
  }
  prepararEstorno(movimento: MovimentacaoEstoque): void {
    this.estorno = movimento; this.motivo.reset(''); this.error = ''; this.success = ''; this.chaveEstorno = crypto.randomUUID();
  }
  confirmarEstorno(): void {
    if (!this.estorno || this.motivo.invalid || this.saving) return;
    this.saving = true; this.error = '';
    this.service.estornar(this.estorno.movimento_id!, this.motivo.value!, this.chaveEstorno)
      .pipe(finalize(() => this.saving = false)).subscribe({
        next: () => { this.estorno = null; this.success = 'Estorno registrado. O histórico original foi preservado.'; this.carregar(); },
        error: err => this.error = err.error?.message || 'Não foi possível estornar a movimentação.',
      });
  }
}
