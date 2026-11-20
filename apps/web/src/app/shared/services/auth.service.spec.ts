import {AuthService} from './auth.service';
import {of,firstValueFrom} from 'rxjs';
import {vi,describe,it,expect} from 'vitest';
describe('Login em duas etapas',()=>{
 it('não estabelece sessão nem navega quando a API exige segundo fator',async()=>{const session={estabelecer:vi.fn()},router={navigate:vi.fn()},http={post:vi.fn(()=>of({mfa_required:true,desafio:'pending'}))};const auth=new AuthService({} as any,router as any,http as any,session as any);expect(await firstValueFrom(auth.login('user','password'))).toBe(false);expect(auth.desafio).toBe('pending');expect(session.estabelecer).not.toHaveBeenCalled();expect(router.navigate).not.toHaveBeenCalled();});
 it('só estabelece sessão depois da confirmação do fator',async()=>{const session={estabelecer:vi.fn(),token:()=> 'jwt',claims:()=>({usuario_perfil_id:1})},router={navigate:vi.fn()},http={post:vi.fn((_url:string,_body:unknown)=>of({token:'jwt'}))};const auth=new AuthService({} as any,router as any,http as any,session as any);auth.desafio='pending';expect(await firstValueFrom(auth.concluirMfa('123456'))).toBe(true);expect(http.post.mock.calls[0][1]).toEqual({desafio:'pending',codigo:'123456'});expect(session.estabelecer).toHaveBeenCalledWith('jwt');expect(auth.desafio).toBe('');});
});
