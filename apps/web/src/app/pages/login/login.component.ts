import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({selector:'app-login',templateUrl:'./login.component.html',styleUrls:['./login.component.scss']})
export class LoginComponent {
  usuario_login='';usuario_password='';errorMessage='';isLoading=false;
  constructor(private auth:AuthService,private route:ActivatedRoute){}
  get aviso():string{const motivo=this.route.snapshot.queryParamMap.get('motivo');return motivo==='atualizada'?'Sua senha foi atualizada. Entre novamente.':motivo==='expirada'?'Sua sessão foi encerrada ou expirou. Entre novamente.':'';}
  login():void{if(this.isLoading)return;this.isLoading=true;this.errorMessage='';this.auth.login(this.usuario_login,this.usuario_password).subscribe(success=>{this.isLoading=false;if(!success)this.errorMessage=this.auth.loginError;});}
}
