import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/shared/services/auth.service';
import { CADASTROS, Cadastro, CadastrosService, PaginaCadastros, TipoCadastro } from 'src/app/shared/services/cadastros.service';
import { CadastroDialogComponent } from './cadastro-dialog.component';
@Component({ selector: 'app-cadastros', templateUrl: './cadastros.component.html', styleUrls: ['./cadastros.component.scss'] })
export class CadastrosComponent implements OnInit, OnDestroy {
  tipos: TipoCadastro[] = ['categorias','unidades','fornecedores'];
  configs = CADASTROS;
  tipo: TipoCadastro = 'categorias';
  data: PaginaCadastros | null = null;
  busca = new FormControl('');
  pagina = 1; tamanho = 10; loading = false; error = ''; success = '';
  private reload = new Subject<void>();
  private destroy = new Subject<void>();
  get config() { return CADASTROS[this.tipo]; }
  get podeAlterar(): boolean { return this.auth.isAdmin() || this.auth.isGerente(); }
  constructor(private route: ActivatedRoute, private router: Router, private service: CadastrosService, private dialog: MatDialog, public auth: AuthService) {}
  ngOnInit(): void {
    this.reload.pipe(switchMap(() => {
      this.loading = true; this.error = '';
      return this.service.listar(this.tipo,this.busca.value || '',this.pagina,this.tamanho).pipe(catchError(err => { this.error = err.error?.message || 'Não foi possível consultar os cadastros. Tente novamente.'; return of(null); }),finalize(()=>this.loading=false));
    }),takeUntil(this.destroy)).subscribe(data=>{ if(data){this.data=data;this.pagina=data.pagina;} });
    this.route.paramMap.pipe(takeUntil(this.destroy)).subscribe(params=>{
      const tipo = params.get('tipo');
      if(!tipo || !this.tipos.includes(tipo as TipoCadastro)){this.router.navigate(['/home/cadastros/categorias']);return;}
      this.tipo=tipo as TipoCadastro;this.pagina=1;this.data=null;this.success='';this.busca.reset('',{emitEvent:false});this.atualizar();
    });
    this.busca.valueChanges.pipe(debounceTime(300),takeUntil(this.destroy)).subscribe(()=>{this.pagina=1;this.success='';this.atualizar();});
  }
  atualizar(): void { this.reload.next(); }
  limpar(): void { this.busca.setValue(''); }
  paginar(event: PageEvent): void { this.pagina=event.pageIndex+1;this.tamanho=event.pageSize;this.atualizar(); }
  abrir(registro?: Cadastro, excluir = false): void {
    if(!this.podeAlterar)return;
    const tipo = this.tipo;
    this.dialog.open(CadastroDialogComponent,{width:'540px',maxWidth:'95vw',data:{tipo,registro,excluir}}).afterClosed().pipe(takeUntil(this.destroy)).subscribe(result=>{
      if(!result || this.tipo!==tipo)return;
      this.success=excluir?'Cadastro excluído.':registro?'Cadastro atualizado. Os vínculos foram preservados.':'Cadastro criado.';
      if(!registro){this.busca.reset('',{emitEvent:false});this.pagina=1;}
      this.atualizar();
    });
  }
  ngOnDestroy(): void { this.destroy.next();this.destroy.complete(); }
}
