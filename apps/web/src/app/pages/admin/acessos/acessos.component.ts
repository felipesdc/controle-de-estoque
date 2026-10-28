import { Component,OnInit,OnDestroy } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute,Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject,of } from 'rxjs';
import { debounceTime,switchMap,catchError,finalize,takeUntil } from 'rxjs/operators';
import { AcessosService,UsuarioAcesso,PerfilAcesso,PaginaUsuarios } from 'src/app/shared/services/acessos.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { AcessoDialogComponent } from './acesso-dialog.component';
@Component({selector:'app-acessos',templateUrl:'./acessos.component.html',styleUrls:['./acessos.component.scss']})
export class AcessosComponent implements OnInit,OnDestroy {
  aba='usuarios';perfis:PerfilAcesso[]=[];data:PaginaUsuarios|null=null;pagina=1;tamanho=10;loading=false;error='';success='';
  filtros=this.fb.group({q:[''],estado:['todos'],perfil:['']});private reload=new Subject<void>();private destroy=new Subject<void>();
  constructor(private fb:FormBuilder,private service:AcessosService,private route:ActivatedRoute,private router:Router,private dialog:MatDialog,public auth:AuthService){}
  get atual(){return this.auth.session.claims()?.usuario_id;}
  ngOnInit():void{
    this.reload.pipe(switchMap(()=>{this.loading=true;this.error='';return this.service.usuarios({...this.filtros.getRawValue(),pagina:this.pagina,tamanho:this.tamanho} as Record<string,string|number>).pipe(catchError(e=>{this.error=e.error?.message||'Não foi possível carregar os usuários.';return of(null);}),finalize(()=>this.loading=false));}),takeUntil(this.destroy)).subscribe(data=>{if(data){this.data=data;this.pagina=data.pagina;}});
    this.route.paramMap.pipe(takeUntil(this.destroy)).subscribe(params=>{this.aba=params.get('aba')||'usuarios';if(!['usuarios','perfis'].includes(this.aba)){this.router.navigate(['/admin/acessos/usuarios']);return;}this.error='';this.success='';this.atualizar();});
    this.filtros.valueChanges.pipe(debounceTime(300),takeUntil(this.destroy)).subscribe(()=>{this.pagina=1;this.reload.next();});
  }
  atualizar():void{this.service.perfis().pipe(takeUntil(this.destroy)).subscribe({next:p=>this.perfis=p,error:e=>this.error=e.error?.message||'Não foi possível carregar os perfis.'});if(this.aba==='usuarios')this.reload.next();}
  paginar(e:PageEvent):void{this.pagina=e.pageIndex+1;this.tamanho=e.pageSize;this.reload.next();}
  limpar():void{this.filtros.reset({q:'',estado:'todos',perfil:''});}
  abrir(usuario?:UsuarioAcesso,perfil?:PerfilAcesso,acao?:string):void{
    this.dialog.open(AcessoDialogComponent,{width:'560px',maxWidth:'95vw',data:{tipo:perfil||this.aba==='perfis'?'perfil':'usuario',usuario,perfil,perfis:this.perfis,acao}}).afterClosed().pipe(takeUntil(this.destroy)).subscribe(result=>{if(result&&!result.selfPasswordChanged){this.success='Alteração salva com sucesso.';this.atualizar();}});
  }
  ngOnDestroy():void{this.destroy.next();this.destroy.complete();}
}
