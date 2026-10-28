import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
interface Claims { usuario_id:number;usuario_perfil_id:number;exp:number;jti:string; }
@Injectable({providedIn:'root'})
export class SessionStateService implements OnDestroy {
  private value:string|null=null;
  private timer?:ReturnType<typeof setTimeout>;
  readonly authenticated=new BehaviorSubject(false);
  aviso='';
  private onStorage=(event:StorageEvent)=>{if(event.key==='token'){if(event.newValue){this.estabelecer(event.newValue,false);if(this.value)this.router.navigate(['/home/dashboard']);else this.encerrar('expirada');}else this.encerrar('saida');}};
  constructor(private router:Router){const token=localStorage.getItem('token');if(token)this.estabelecer(token,false);window.addEventListener('storage',this.onStorage);}
  claims(token=this.value):Claims|null{try{if(!token)return null;const p=jwtDecode<Claims>(token);return Number.isSafeInteger(p.usuario_id)&&Number.isSafeInteger(p.usuario_perfil_id)&&typeof p.jti==='string'&&Number.isFinite(p.exp)&&p.exp*1000>Date.now()?p:null;}catch{return null;}}
  estabelecer(token:string,persist=true):void{const p=this.claims(token);if(!p){if(this.timer)clearTimeout(this.timer);this.value=null;localStorage.removeItem('token');this.authenticated.next(false);this.aviso='expirada';return;}this.value=token;if(persist)localStorage.setItem('token',token);this.aviso='';this.authenticated.next(true);if(this.timer)clearTimeout(this.timer);this.timer=setTimeout(()=>this.encerrar('expirada'),Math.min(p.exp*1000-Date.now(),2147483647));}
  token():string|null{if(this.value&&!this.claims())this.encerrar('expirada');return this.value;}
  encerrar(motivo='saida'):void{this.value=null;this.aviso=motivo;localStorage.removeItem('token');localStorage.removeItem('role');this.authenticated.next(false);if(this.timer)clearTimeout(this.timer);this.router.navigate(['/login'],{queryParams:motivo==='saida'?{}:{motivo}});}
  ngOnDestroy():void{if(this.timer)clearTimeout(this.timer);window.removeEventListener('storage',this.onStorage);}
}
