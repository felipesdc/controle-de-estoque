import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {SeletorCadastroComponent} from './seletor-cadastro.component';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const esperar=(ms=10)=>new Promise(resolve=>setTimeout(resolve,ms));
const pagina=(selecionado:any=null)=>({itens:[{id:1,nome:'Primeira'}],total:63,pagina:1,tamanho:25,selecionado});
describe('Seletor remoto de cadastros',()=>{
 beforeEach(()=>TestBed.configureTestingModule({imports:[SeletorCadastroComponent],providers:[provideHttpClient(),provideHttpClientTesting()]}));
 afterEach(()=>{TestBed.inject(HttpTestingController).verify();TestBed.resetTestingModule();});
 function criar(id:number|null=null){const fixture=TestBed.createComponent(SeletorCadastroComponent);fixture.componentRef.setInput('tipo','categorias');fixture.componentRef.setInput('label','Categoria');const component=fixture.componentInstance;const mudar=vi.fn();component.registerOnChange(mudar);component.writeValue(id);fixture.autoDetectChanges();return{fixture,component,mudar,http:TestBed.inject(HttpTestingController)};}
 it('hidrata um ID fora da página sem alterar o formulário e atualiza o texto sozinho',async()=>{
  const {fixture,component,mudar,http}=criar(63);await esperar();
  expect(component.validate({} as any)).not.toBeNull();
  http.expectOne(r=>r.params.get('selecionado')==='63').flush(pagina({id:63,nome:'Última categoria'}));await fixture.whenStable();
  expect(fixture.nativeElement.querySelector('input').value).toBe('Última categoria');expect(component.valor()).toBe(63);expect(mudar).not.toHaveBeenCalled();expect(component.validate({} as any)).toBeNull();
 });
 it('limpa o ID ao digitar, cancela a consulta antiga e só aceita a seleção explícita',async()=>{
  const {fixture,component,mudar,http}=criar(63);await esperar();const antigo=http.expectOne(r=>r.params.get('selecionado')==='63');
  const input=fixture.nativeElement.querySelector('input') as HTMLInputElement;input.value='nova';input.dispatchEvent(new Event('input'));expect(antigo.cancelled).toBe(true);expect(mudar).toHaveBeenLastCalledWith(null);expect(component.valor()).toBeNull();await esperar(280);
  http.expectOne(r=>r.params.get('q')==='nova').flush(pagina());await fixture.whenStable();component.escolher({id:7,nome:'Nova categoria'});expect(mudar).toHaveBeenLastCalledWith(7);expect(component.texto.value).toEqual({id:7,nome:'Nova categoria'});
 });
 it('bloqueia o formulário se o cadastro selecionado sumiu e permite limpar sem escolha silenciosa',async()=>{
  const {fixture,component,mudar,http}=criar(999);await esperar();http.expectOne(r=>r.params.get('selecionado')==='999').flush(pagina());await fixture.whenStable();expect(component.valor()).toBe(999);expect(component.validate({} as any)).not.toBeNull();expect(mudar).not.toHaveBeenCalled();
  component.limpar();expect(mudar).toHaveBeenLastCalledWith(null);await esperar();http.expectOne(r=>!r.params.has('selecionado')).flush(pagina());await fixture.whenStable();expect(component.validate({} as any)).toBeNull();
 });
});
