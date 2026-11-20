import { ChangeDetectionStrategy } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({ changeDetection: ChangeDetectionStrategy.Eager, standalone: false,selector:'app-login',templateUrl:'./login.component.html',styleUrls:['./login.component.scss']})
export class LoginComponent {
  codigo='';usuario_login='';usuario_password='';errorMessage='';isLoading=false;
  constructor(public auth:AuthService,private route:ActivatedRoute){}
  get aviso():string{const motivo=this.route.snapshot.queryParamMap.get('motivo');return motivo==='atualizada'?'Sua senha foi atualizada. Entre novamente.':motivo==='expirada'?'Sua sessão foi encerrada ou expirou. Entre novamente.':'';}
  login():void{if(this.isLoading)return;this.isLoading=true;this.errorMessage='';const request=this.auth.desafio?this.auth.concluirMfa(this.codigo):this.auth.login(this.usuario_login,this.usuario_password);request.subscribe(success=>{this.isLoading=false;this.usuario_password='';this.codigo='';if(!success)this.errorMessage=this.auth.loginError;});}
  reiniciar():void{this.auth.desafio='';this.codigo='';this.errorMessage='';}
}
