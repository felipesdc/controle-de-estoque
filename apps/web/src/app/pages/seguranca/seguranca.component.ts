import { ChangeDetectionStrategy } from '@angular/core';
import {Component,OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {Router,RouterLink} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {environment} from 'src/environments/environment';
import {MaterialModule} from 'src/app/shared/material/material.module';
import {SessionStateService} from 'src/app/shared/services/session-state.service';
interface Estado {mfa_disponivel:boolean;mfa_ativo:boolean;codigos_restantes:number;eventos:{id:number;tipo:string;data:string}[];}
@Component({ changeDetection: ChangeDetectionStrategy.Eager,selector:'app-seguranca',imports:[CommonModule,FormsModule,MaterialModule],templateUrl:'./seguranca.component.html',styleUrl:'./seguranca.scss'})
export class SegurancaComponent implements OnInit{
  estado?:Estado;senha='';codigo='';nova='';confirmacao='';segredo='';codigos:string[]=[];ocupado=false;mensagem='';erro='';
  constructor(private http:HttpClient,private session:SessionStateService){}
  ngOnInit(){this.carregar();}
  private carregar(){this.http.get<Estado>(`${environment.apiurl}/seguranca`).subscribe({next:v=>this.estado=v,error:()=>this.erro='Não foi possível consultar sua segurança.'});}
  executar(acao:string){if(this.ocupado)return;if(acao==='senha'&&this.nova!==this.confirmacao){this.erro='As novas senhas devem ser iguais.';return;}
    this.ocupado=true;this.erro='';this.mensagem='';this.codigos=[];
    const path=acao==='senha'?'senha':'mfa/'+acao;
    const body=acao==='senha'?{senha_atual:this.senha,nova_senha:this.nova,codigo:this.codigo}:acao==='ativar'?{codigo:this.codigo}:{senha:this.senha,codigo:this.codigo};
    this.http.post<{segredo?:string;codigos?:string[]}>(`${environment.apiurl}/seguranca/${path}`,acao==='preparar'?{senha:this.senha}:body).pipe(finalize(()=>{this.ocupado=false;this.senha='';this.codigo='';this.nova='';this.confirmacao='';})).subscribe({next:r=>{this.segredo=r.segredo||'';this.codigos=r.codigos||[];this.mensagem=acao==='preparar'?'Adicione a chave ao autenticador e confirme o código.':acao==='senha'?'Senha atualizada. Entre novamente.':'Configuração atualizada.';if(acao==='senha')this.session.encerrar('atualizada');else this.carregar();},error:e=>this.erro=e.error?.message||'Não foi possível atualizar a segurança.'});
  }
}
@Component({ changeDetection: ChangeDetectionStrategy.Eager,selector:'app-recuperacao',imports:[CommonModule,FormsModule,MaterialModule,RouterLink],template:`<section class="security"><mat-card><h1>{{redefinir?'Criar nova senha':'Recuperar acesso'}}</h1><p role="alert" *ngIf="erro">{{erro}}</p><p role="status" *ngIf="mensagem">{{mensagem}}</p><p *ngIf="!disponivel&&!redefinir">A recuperação por e-mail ainda não está configurada. Procure o administrador.</p><form (ngSubmit)="enviar()" #form="ngForm" *ngIf="!concluido&&(disponivel||redefinir)"><ng-container *ngIf="!redefinir"><mat-form-field appearance="outline"><mat-label>E-mail da conta</mat-label><input matInput type="email" name="email" [(ngModel)]="email" required maxlength="254" autocomplete="email"></mat-form-field></ng-container><ng-container *ngIf="redefinir"><p>A senha deve ter ao menos 12 caracteres e até 72 bytes. O segundo fator continuará ativo.</p><mat-form-field appearance="outline"><mat-label>Nova senha</mat-label><input matInput type="password" name="senha" [(ngModel)]="senha" required minlength="12" autocomplete="new-password"></mat-form-field><mat-form-field appearance="outline"><mat-label>Confirme a nova senha</mat-label><input matInput type="password" name="confirmacao" [(ngModel)]="confirmacao" required autocomplete="new-password"></mat-form-field></ng-container><button mat-flat-button type="submit" [disabled]="form.invalid||ocupado">{{ocupado?'Aguarde…':redefinir?'Salvar senha':'Enviar instruções'}}</button></form><a routerLink="/login">Voltar ao login</a></mat-card></section>`,styleUrl:'./seguranca.scss'})
export class RecuperacaoComponent implements OnInit{
  redefinir=false;disponivel=false;concluido=false;ocupado=false;email='';senha='';confirmacao='';erro='';mensagem='';private token='';
  constructor(private http:HttpClient,private router:Router){this.redefinir=router.url.startsWith('/redefinir-senha');if(this.redefinir){this.token=new URLSearchParams(window.location.hash.slice(1)).get('token')||'';void router.navigate(['/redefinir-senha'],{replaceUrl:true});}}
  ngOnInit(){if(this.redefinir){if(!/^[a-f0-9]{64}$/.test(this.token)){this.erro='Link inválido. Solicite novas instruções.';this.concluido=true;}}else this.http.get<{recuperacao_email:boolean}>(`${environment.apiurl}/auth/configuracao`).subscribe({next:r=>this.disponivel=r.recuperacao_email,error:()=>this.erro='Não foi possível consultar a recuperação.'});}
  enviar(){if(this.ocupado)return;if(this.redefinir&&this.senha!==this.confirmacao){this.erro='As senhas devem ser iguais.';return;}this.ocupado=true;this.erro='';this.http.post<{message:string}>(`${environment.apiurl}/auth/${this.redefinir?'redefinir':'recuperar'}`,this.redefinir?{token:this.token,senha:this.senha}:{email:this.email}).pipe(finalize(()=>{this.ocupado=false;this.senha='';this.confirmacao='';})).subscribe({next:r=>{this.concluido=true;this.mensagem=r.message;this.token='';},error:e=>this.erro=e.error?.message||'Não foi possível concluir. Tente novamente.'});}
}
