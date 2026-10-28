import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
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
export class MovimentacoesComponent implements OnInit, OnDestroy {
  produtos: Produto[] = [];
  movimentos: MovimentacaoEstoque[] = [];
  loading = true;
  saving = false;
  error = '';
  success = '';
  filtros = {q: '', inicio: '', fim: '', produto: '', responsavel: '', tipo: ''};
  responsaveis: {id: number; nome: string}[] = [];
  total = 0;
  pagina = 1;
  tamanho = 10;
  private consulta?: Subscription;
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
  constructor(private fb: FormBuilder, private service: MovimentacaoEstoqueService, private produtoService: ProdutoService, public auth: AuthService, private route: ActivatedRoute) {}
  get podeAlterar(): boolean { return this.auth.isAdmin() || this.auth.isGerente(); }
  get produto(): Produto | undefined { return this.produtos.find(p => p.produto_id === this.form.value.movimento_produto_id); }
  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => { this.chave = crypto.randomUUID(); this.success = ''; });
    const selected = Number(this.route.snapshot.queryParamMap.get('produto'));
    if (Number.isSafeInteger(selected) && selected > 0) this.form.patchValue({ movimento_produto_id: selected });
    this.carregar();
  }
  dataMovimento(value: Date): string {
    const raw = String(value);
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw) ? raw : raw + (raw.length === 10 ? 'T00:00:00Z' : 'Z');
    const date = new Date(normalized);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(date) : 'Data indisponível';
  }
  ngOnDestroy(): void { this.consulta?.unsubscribe(); }
  aplicar(): void { this.pagina = 1; this.carregar(); }
  limpar(): void { this.filtros = {q: '', inicio: '', fim: '', produto: '', responsavel: '', tipo: ''}; this.aplicar(); }
  paginar(event: {pageIndex: number; pageSize: number}): void { this.pagina = event.pageIndex + 1; this.tamanho = event.pageSize; this.carregar(); }
  carregar(): void {
    this.consulta?.unsubscribe();
    this.loading = true; this.error = '';
    this.consulta = forkJoin({ produtos: this.produtoService.getProdutos(), responsaveis: this.service.responsaveis(), movimentos: this.service.historico({...this.filtros, pagina: this.pagina, tamanho: this.tamanho}) })
      .pipe(timeout(15000), finalize(() => this.loading = false)).subscribe({
        next: ({ produtos, responsaveis, movimentos }) => { this.produtos = produtos; this.responsaveis = responsaveis; this.movimentos = movimentos.itens; this.total = movimentos.total; this.pagina = movimentos.pagina; },
        error: err => { this.movimentos = []; this.total = 0; this.error = err.error?.message || 'Não foi possível carregar os dados. Tente atualizar.'; },
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
          this.pagina = 1; this.carregar();
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
