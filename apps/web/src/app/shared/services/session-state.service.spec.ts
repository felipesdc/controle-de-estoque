import {SessionStateService} from './session-state.service';
import {Router} from '@angular/router';
import {vi,describe,it,expect,beforeEach,afterEach} from 'vitest';
const token=(exp:number)=>'e30.'+btoa(JSON.stringify({usuario_id:1,usuario_perfil_id:1,jti:'test-session',exp}))+'.sig';
describe('Sessão por aba',()=>{
 let service:SessionStateService;const router={navigate:vi.fn()};
 beforeEach(()=>{localStorage.clear();sessionStorage.clear();router.navigate.mockClear();});
 afterEach(()=>service?.ngOnDestroy());
 it('migra o token antigo uma vez e remove a cópia compartilhada',()=>{const t=token(Date.now()/1000+60);localStorage.setItem('token',t);service=new SessionStateService(router as unknown as Router);expect(service.token()).toBe(t);expect(sessionStorage.getItem('token')).toBe(t);expect(localStorage.getItem('token')).toBeNull();});
 it('não aceita token expirado e remove a sessão persistida',()=>{sessionStorage.setItem('token',token(Date.now()/1000-1));service=new SessionStateService(router as unknown as Router);expect(service.token()).toBeNull();expect(sessionStorage.getItem('token')).toBeNull();expect(service.authenticated.value).toBe(false);});
 it('propaga somente o aviso de saída para outras abas',()=>{service=new SessionStateService(router as unknown as Router);service.estabelecer(token(Date.now()/1000+60));service.encerrar();expect(localStorage.getItem('sessao-encerrada')).toBeTruthy();expect(localStorage.getItem('token')).toBeNull();expect(sessionStorage.getItem('token')).toBeNull();});
 it('encerra ao receber saída de outra aba, sem retransmitir',()=>{service=new SessionStateService(router as unknown as Router);service.estabelecer(token(Date.now()/1000+60));window.dispatchEvent(new StorageEvent('storage',{key:'sessao-encerrada',newValue:'other-tab'}));expect(service.token()).toBeNull();expect(localStorage.getItem('sessao-encerrada')).toBeNull();});
});
