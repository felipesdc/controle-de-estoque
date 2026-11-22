import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting,HttpTestingController} from '@angular/common/http/testing';
import {FormControl} from '@angular/forms';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {SeletorFiltroComponent} from './seletor-filtro.component';
afterEach(()=>TestBed.resetTestingModule());
describe('Filtro remoto com estados especiais',()=>{
 it('preserva sem categoria e limpa IDs ao trocar o escopo',()=>{TestBed.configureTestingModule({imports:[SeletorFiltroComponent],providers:[provideHttpClient(),provideHttpClientTesting()]});const f=TestBed.createComponent(SeletorFiltroComponent),c=f.componentInstance;c.tipo='categorias';c.especial='sem';const change=vi.fn();c.registerOnChange(change);f.detectChanges();c.writeValue('sem');expect(c.modo.value).toBe('sem');expect(c.validate(new FormControl())).toBeNull();c.modo.setValue('especifico');expect(c.validate(new FormControl())).toBeTruthy();c.id.setValue(42);expect(change).toHaveBeenLastCalledWith('42');c.modo.setValue('');expect(c.id.value).toBeNull();expect(change).toHaveBeenLastCalledWith('');});
 it('hidrata um ID fora da página sem disparar mudança no valor original',async()=>{TestBed.configureTestingModule({imports:[SeletorFiltroComponent],providers:[provideHttpClient(),provideHttpClientTesting()]});const f=TestBed.createComponent(SeletorFiltroComponent),c=f.componentInstance;c.tipo='produtos-historico';const change=vi.fn();c.registerOnChange(change);c.writeValue('42');f.detectChanges();await new Promise(resolve=>setTimeout(resolve,10));TestBed.inject(HttpTestingController).expectOne(r=>r.url.endsWith('/movimentacao-estoque/opcoes/produtos')&&r.params.get('selecionado')==='42').flush({itens:[],total:0,pagina:1,tamanho:25,selecionado:{id:42,nome:'Produto inativo'}});expect(c.id.value).toBe(42);expect(change).not.toHaveBeenCalled();});
});
