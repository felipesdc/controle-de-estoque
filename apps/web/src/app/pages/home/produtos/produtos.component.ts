import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { Catalogo, ProdutoCatalogo } from 'src/app/shared/models/catalogo.model';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { CategoriaService } from 'src/app/shared/services/categoria.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { ProdutosCreateDialogComponent } from './produtos-create-dialog/produtos-create-dialog.component';
import { ProdutoStatusDialogComponent } from './produto-status-dialog.component';

@Component({ selector: 'app-produtos', templateUrl: './produtos.component.html', styleUrls: ['./produtos.component.scss'] })
export class ProdutosComponent implements OnInit, OnDestroy {
  catalogo: Catalogo | null = null;
  categorias: Categoria[] = [];
  loading = false;
  error = '';
  success = '';
  opcoesError = false;
  pagina = 1;
  tamanho = 10;
  private reload = new Subject<void>();
  private destroy = new Subject<void>();
  filtros = this.fb.group({ q: [''], estado: ['ativos'], estoque: ['todos'], vencimento: ['todos'], categoria: [''], ordem: ['nome'] });
  constructor(private fb: FormBuilder, private service: ProdutoService, private categoriaService: CategoriaService, private dialog: MatDialog, public auth: AuthService, private route: ActivatedRoute) {}
  get podeAlterar(): boolean { return this.auth.isAdmin() || this.auth.isGerente(); }
  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const initial: Record<string, string> = {};
    const choices: Record<string, string[]> = { estoque: ['todos','baixo','zerado','disponivel'], vencimento: ['todos','vencido','em_breve','sem_validade'], estado: ['ativos','inativos','todos'] };
    Object.entries(choices).forEach(([key, options]) => { const value = params.get(key); if (value && options.includes(value)) initial[key] = value; });
    const categoria = params.get('categoria');
    if (categoria && (categoria === 'sem' || (/^\d+$/.test(categoria) && Number(categoria) > 0))) initial.categoria = categoria;
    this.filtros.patchValue(initial, { emitEvent: false });
    this.reload.pipe(switchMap(() => {
      this.loading = true; this.error = '';
      return this.service.getCatalogo({ ...this.filtros.getRawValue(), pagina: this.pagina, tamanho: this.tamanho, direcao: this.filtros.value.ordem === 'recentes' ? 'desc' : 'asc' } as Record<string, string | number>)
        .pipe(catchError(err => { this.error = err.error?.message || 'Não foi possível carregar o catálogo. Tente novamente.'; return of(null); }), finalize(() => this.loading = false));
    }), takeUntil(this.destroy)).subscribe(data => { if (data) { this.catalogo = data; this.pagina = data.pagina; } });
    this.filtros.valueChanges.pipe(debounceTime(300), takeUntil(this.destroy)).subscribe(() => { this.pagina = 1; this.success = ''; this.atualizar(); });
    this.carregarOpcoes(); this.atualizar();
  }
  carregarOpcoes(): void {
    this.opcoesError = false;
    this.categoriaService.getCategorias().pipe(takeUntil(this.destroy)).subscribe({ next: data => this.categorias = data, error: () => this.opcoesError = true });
  }
  atualizar(): void { this.reload.next(); }
  limpar(): void { this.filtros.reset({ q: '', estado: 'ativos', estoque: 'todos', vencimento: 'todos', categoria: '', ordem: 'nome' }); }
  paginar(event: PageEvent): void { this.pagina = event.pageIndex + 1; this.tamanho = event.pageSize; this.atualizar(); }
  novo(): void {
    if (!this.podeAlterar) return;
    this.dialog.open(ProdutosCreateDialogComponent, { width: '560px', maxWidth: '95vw', autoFocus: 'first-tabbable' }).afterClosed().pipe(takeUntil(this.destroy)).subscribe(saved => {
      if (saved) {
        this.filtros.reset({ q: '', estado: 'ativos', estoque: 'todos', vencimento: 'todos', categoria: '', ordem: 'recentes' }, { emitEvent: false });
        this.success = saved.produto_quantidade_estoque > 0 ? 'Produto cadastrado. O saldo inicial foi registrado no histórico.' : 'Produto cadastrado com saldo zero.';
        this.pagina = 1; this.atualizar();
      }
    });
  }
  editar(produto: ProdutoCatalogo): void {
    if (!this.podeAlterar) return;
    this.dialog.open(ProdutosCreateDialogComponent, { width: '560px', maxWidth: '95vw', data: produto }).afterClosed().pipe(takeUntil(this.destroy)).subscribe(saved => {
      if (saved) { this.success = 'Dados do produto atualizados. O saldo foi preservado.'; this.atualizar(); }
    });
  }
  alterarEstado(produto: ProdutoCatalogo): void {
    if (!this.podeAlterar) return;
    this.dialog.open(ProdutoStatusDialogComponent, { width: '460px', maxWidth: '95vw', data: produto }).afterClosed().pipe(takeUntil(this.destroy)).subscribe(saved => {
      if (saved) { this.success = produto.produto_estado ? 'Produto inativado. Saldo e histórico preservados.' : 'Produto reativado.'; this.atualizar(); }
    });
  }
  ngOnDestroy(): void { this.destroy.next(); this.destroy.complete(); }
}
