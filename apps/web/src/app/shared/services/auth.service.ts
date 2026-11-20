import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable,of } from 'rxjs';
import { catchError,map,timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SessionStateService } from './session-state.service';
@Injectable({providedIn:'root'})
export class AuthService {
  loginError='';
  constructor(private snack:MatSnackBar,private router:Router,private http:HttpClient,public session:SessionStateService){}
  showMessage(msg:string,css:string):void{this.snack.open(msg,'Fechar',{duration:4000,panelClass:[css]});}
  desafio='';
  private resposta(response:any):boolean{
    if(response.mfa_required){this.desafio=response.desafio;return false;}
    this.session.estabelecer(response.token);if(!this.getToken())throw new Error('Resposta de sessão inválida');
    this.desafio='';this.router.navigate([this.podeOperarEstoque()&&!this.isAdmin()&&!this.isGerente()?'/home/operar':'/home/dashboard']);return true;
  }
  private falha(error:any):Observable<boolean>{this.loginError=error.status===429?'Muitas tentativas. Aguarde antes de tentar novamente.':error.error?.message||'Não foi possível entrar. Verifique a conexão.';return of(false);}
  login(usuario_login:string,usuario_password:string):Observable<boolean>{
    this.loginError='';this.desafio='';
    return this.http.post(`${environment.apiurl}/usuario/login`,{usuario_login,usuario_password}).pipe(timeout(15000),map(response=>this.resposta(response)),catchError(error=>this.falha(error)));
  }
  concluirMfa(codigo:string):Observable<boolean>{this.loginError='';return this.http.post(`${environment.apiurl}/auth/mfa`,{desafio:this.desafio,codigo}).pipe(timeout(15000),map(response=>this.resposta(response)),catchError(error=>this.falha(error)));}
  validarSessao():Observable<boolean>{if(!this.getToken())return of(false);return this.http.get(`${environment.apiurl}/sessao`).pipe(timeout(15000),map(()=>true),catchError(()=>of(false)));}
  logout():void{const token=this.getToken();this.session.encerrar();if(token)this.http.post(`${environment.apiurl}/sessao/sair`,{},{headers:new HttpHeaders({Authorization:`Bearer ${token}`})}).pipe(timeout(5000),catchError(()=>of(null))).subscribe();}
  getToken():string|null{return this.session.token();}
  isAdmin():boolean{return this.session.claims()?.usuario_perfil_id===1;}
  isGerente():boolean{return this.session.claims()?.usuario_perfil_id===2;}
  podeOperarEstoque():boolean{return this.isAdmin()||this.isGerente()||this.session.claims()?.usuario_operar_estoque===true;}
  isFuncionario():boolean{const p=this.session.claims();return !!p&&![1,2].includes(p.usuario_perfil_id);}
  isLoggedIn():Observable<boolean>{return this.session.authenticated.asObservable();}
}
