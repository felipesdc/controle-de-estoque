import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
interface Claims { usuario_operar_estoque?:boolean; usuario_id:number;usuario_perfil_id:number;exp:number;jti:string; }
@Injectable({providedIn:'root'})
export class SessionStateService implements OnDestroy {
  private value:string|null=null;
  private timer?:ReturnType<typeof setTimeout>;
  readonly authenticated=new BehaviorSubject(false);
  aviso='';
  private onStorage=(event:StorageEvent)=>{if(event.key==='sessao-encerrada'&&event.newValue)this.encerrar('saida',false);};
  constructor(private router:Router){const token=sessionStorage.getItem('token')||localStorage.getItem('token');localStorage.removeItem('token');localStorage.removeItem('role');if(token)this.estabelecer(token);window.addEventListener('storage',this.onStorage);}
  claims(token=this.value):Claims|null{try{if(!token)return null;const p=jwtDecode<Claims>(token);return Number.isSafeInteger(p.usuario_id)&&Number.isSafeInteger(p.usuario_perfil_id)&&typeof p.jti==='string'&&Number.isFinite(p.exp)&&p.exp*1000>Date.now()?p:null;}catch{return null;}}
  estabelecer(token:string,persist=true):void{const p=this.claims(token);if(!p){if(this.timer)clearTimeout(this.timer);this.value=null;sessionStorage.removeItem('token');this.authenticated.next(false);this.aviso='expirada';return;}this.value=token;if(persist)sessionStorage.setItem('token',token);this.aviso='';this.authenticated.next(true);if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>this.encerrar('expirada'),Math.min(p.exp*1000-Date.now(),2147483647));}
  token():string|null{if(this.value&&!this.claims())this.encerrar('expirada');return this.value;}
  encerrar(motivo='saida',propagar=true):void{this.value=null;this.aviso=motivo;sessionStorage.removeItem('token');localStorage.removeItem('token');localStorage.removeItem('role');if(propagar)localStorage.setItem('sessao-encerrada',crypto.randomUUID());this.authenticated.next(false);if(this.timer)clearTimeout(this.timer);this.router.navigate(['/login'],{queryParams:motivo==='saida'?{}:{motivo}});}
  ngOnDestroy():void{if(this.timer)clearTimeout(this.timer);window.removeEventListener('storage',this.onStorage);}
}
