import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {LoginModule} from './login.module';
import {LoginComponent} from './login.component';
import {AuthService} from 'src/app/shared/services/auth.service';
import {afterEach,describe,it,expect} from 'vitest';
describe('Navegação da recuperação',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('renderiza um link navegável para recuperar senha',async()=>{
  TestBed.configureTestingModule({imports:[LoginModule],providers:[provideRouter([]),{provide:AuthService,useValue:{desafio:''}}]});
  const fixture=TestBed.createComponent(LoginComponent);fixture.autoDetectChanges();await fixture.whenStable();
  const link=fixture.nativeElement.querySelector('a');expect(link.textContent).toContain('Esqueci minha senha');expect(link.getAttribute('href')).toBe('/recuperar-senha');
 });
});
