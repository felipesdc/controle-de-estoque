import { MatDialog } from '@angular/material/dialog';
import { CadastroDialogComponent } from '../../cadastros/cadastro-dialog.component';
import { Cadastro, TipoCadastro } from 'src/app/shared/services/cadastros.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { Produto } from 'src/app/shared/models/produto.model';
import { Categoria } from 'src/app/shared/models/categoria.model';
import { Unidade } from 'src/app/shared/models/unidade.model';
import { CategoriaService } from 'src/app/shared/services/categoria.service';
import { UnidadeService } from 'src/app/shared/services/unidade.service';
import { FornecedorService } from 'src/app/shared/services/fornecedor.service';
import { Fornecedor } from 'src/app/shared/models/fornecedor.model';
import { ProdutoService } from 'src/app/shared/services/produto.service';

const nomeValido = (c: AbstractControl) => typeof c.value === 'string' && c.value.trim() ? null : { vazio: true };
const quantidadeValida = (c: AbstractControl) => c.value == null || (typeof c.value === 'number' && Number.isFinite(c.value) && c.value >= 0 && c.value <= 1e9 && Math.abs(c.value * 1000 - Math.round(c.value * 1000)) < 0.00001) ? null : { quantidade: true };
const dataValida = (c: AbstractControl) => {
  if (!c.value) return null;
  const date = new Date(c.value + 'T00:00:00Z');
  return /^\d{4}-\d{2}-\d{2}$/.test(c.value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === c.value ? null : { data: true };
};
@Component({ selector: 'app-produtos-create-dialog', templateUrl: './produtos-create-dialog.component.html', styleUrls: ['./produtos-create-dialog.component.scss'] })
export class ProdutosCreateDialogComponent implements OnInit {
  categorias: Categoria[] = [];
  unidades: Unidade[] = [];
  fornecedores: Fornecedor[] = [];
  loading = true;
  optionsError = false;
  saving = false;
  error = '';
  legadoInvalido=false;
  precoCompra=this.fb.control('',[(c:AbstractControl)=>!c.value||(/^\d+([.,]\d{1,2})?$/.test(c.value)&&Number(String(c.value).replace(',','.'))<=1e10)?null:{preco:true}]);
  precoVenda=this.fb.control('',[(c:AbstractControl)=>!c.value||(/^\d+([.,]\d{1,2})?$/.test(c.value)&&Number(String(c.value).replace(',','.'))<=1e10)?null:{preco:true}]);
  form = this.fb.group({
    produto_descricao: [this.data?.produto_descricao || '', [Validators.required, Validators.maxLength(200), nomeValido]],
    produto_codigo_barras: [this.data?.produto_codigo_barras || '', Validators.maxLength(80)],
    produto_categoria_id: [this.data?.produto_categoria_id ?? null],
    produto_unidade_id: [this.data?.produto_unidade_id ?? null],
    produto_fornecedor_id: [this.data?.produto_fornecedor_id ?? null],
    produto_quantidade_estoque: [this.data?.produto_quantidade_estoque ?? 0, [Validators.required, quantidadeValida]],
    produto_data_validade: [String(this.data?.produto_data_validade || '').slice(0,10), dataValida],
  });
  constructor(private fb: FormBuilder, private dialog: MatDialog, private http: HttpClient, private ref: MatDialogRef<ProdutosCreateDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: Produto | null, private categoriaService: CategoriaService, private unidadeService: UnidadeService, private service: ProdutoService, private fornecedorService: FornecedorService) {}
  ngOnInit(): void {
    if (this.data) {
      this.form.controls.produto_quantidade_estoque.clearValidators();
      this.form.controls.produto_quantidade_estoque.updateValueAndValidity({ emitEvent: false });
    }
    this.carregarOpcoes();
  }
  carregarOpcoes(): void {
    this.loading = true; this.optionsError = false;
    forkJoin({ categorias: this.categoriaService.getCategorias(), unidades: this.unidadeService.getUnidades(), fornecedores: this.fornecedorService.getFornecedores(), precos:this.data?.produto_id?this.http.get<{compra_centavos:number|null;venda_centavos:number|null;legado_invalido:boolean}>(`${environment.apiurl}/produto/${this.data.produto_id}/precos`):of({compra_centavos:null,venda_centavos:null,legado_invalido:false}) }).pipe(timeout(15000), finalize(() => this.loading = false)).subscribe({
      next: data => { this.categorias = data.categorias; this.unidades = data.unidades; this.fornecedores = data.fornecedores; if(!this.precoCompra.dirty&&!this.precoVenda.dirty){this.precoCompra.setValue(data.precos.compra_centavos===null?'':(data.precos.compra_centavos/100).toFixed(2));this.precoVenda.setValue(data.precos.venda_centavos===null?'':(data.precos.venda_centavos/100).toFixed(2));this.legadoInvalido=data.precos.legado_invalido;} },
      error: () => this.optionsError = true,
    });
  }
  cadastro(tipo:'categorias'|'unidades',editar=false):void {
    const id=tipo==='categorias'?this.form.value.produto_categoria_id:this.form.value.produto_unidade_id;
    const nome=tipo==='categorias'?this.categorias.find(c=>c.categoria_id===id)?.categoria_descricao:this.unidades.find(u=>u.unidade_id===id)?.unidade_descricao;
    if(editar&&!id)return;
    this.dialog.open(CadastroDialogComponent,{width:'520px',maxWidth:'95vw',data:{tipo,excluir:false,...(editar?{registro:{id,nome,total_vinculos:0}}:{})}}).afterClosed().subscribe((saved:Cadastro|undefined)=>{
      if(!saved||!saved.id)return;
      if(tipo==='categorias'){this.categorias=this.categorias.filter(c=>c.categoria_id!==saved.id).concat([{categoria_id:saved.id,categoria_descricao:saved.nome}]);this.form.patchValue({produto_categoria_id:saved.id});}
      else{this.unidades=this.unidades.filter(u=>u.unidade_id!==saved.id).concat([{unidade_id:saved.id,unidade_descricao:saved.nome}]);this.form.patchValue({produto_unidade_id:saved.id});}
    });
  }
  salvar(): void {
    if (this.precoCompra.invalid || this.precoVenda.invalid || this.form.invalid || this.saving || this.loading || this.optionsError) { this.form.markAllAsTouched(); return; }
    this.error = '';
    const values = this.form.getRawValue();
    const dados = {
      produto_descricao: values.produto_descricao!.trim(),
      produto_categoria_id: values.produto_categoria_id,
      produto_unidade_id: values.produto_unidade_id,
      produto_fornecedor_id: values.produto_fornecedor_id,
      produto_data_validade: values.produto_data_validade || null,
      produto_codigo_barras: values.produto_codigo_barras?.trim() || null,
    } as unknown as Partial<Produto>;
    if(this.precoCompra.dirty||this.precoVenda.dirty){
      const cents=(v:string|null)=>v?Math.round(Number(v.replace(',','.'))*100):null;
      Object.assign(dados,{produto_precos:{compra_centavos:cents(this.precoCompra.value),venda_centavos:cents(this.precoVenda.value)}});
    }
    const request = this.data?.produto_id
      ? this.service.patchProduto(this.data.produto_id, dados)
      : this.service.createNewProduto({ ...dados, produto_quantidade_estoque: values.produto_quantidade_estoque, produto_estado: true } as Produto);
    this.saving = true; this.ref.disableClose = true; this.form.disable({ emitEvent: false });
    request.pipe(finalize(() => { this.saving = false; this.ref.disableClose = false; this.form.enable({ emitEvent: false }); })).subscribe({
      next: saved => this.ref.close(saved),
      error: err => this.error = err.error?.message || 'Não foi possível salvar. Seus dados foram mantidos neste formulário.',
    });
  }
  cancelar(): void { if (!this.saving) this.ref.close(); }
}
