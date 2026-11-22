import {TestBed} from '@angular/core/testing';
import {NgZone,provideZoneChangeDetection} from '@angular/core';
import {Subject} from 'rxjs';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {SeletorLoteComponent} from './seletor-lote.component';
import {LotesService,ConsultaLotes,Lote} from 'src/app/shared/services/lotes.service';
import {HomeModule} from '../home.module';
import {provideRouter} from '@angular/router';
const candidato:Lote={lote_id:42,codigo:'000FEFO',validade:'2026-11-20',unidade:'kg',saldo_milesimos:125};
const dados=(lote:Lote|null=candidato):ConsultaLotes=>({produto_id:1,produto:'Café',unidade:'kg',saldo:2,identificado:1,sem_lote:1,itens:[],total:0,pagina:1,tamanho:10,data_referencia:'2026-11-20',retirada:{lote,motivo:lote?'vencimento_mais_proximo':'sem_lote_elegivel',avisos:{vencidos:1,sem_validade:1,unidade_incompativel:0},criterio:'validade,registro,id',data_referencia:'2026-11-20',fuso:'America/Sao_Paulo',confirmacao_obrigatoria:true}});
afterEach(()=>TestBed.resetTestingModule());
function preparar(saida=true){
 const respostas:Subject<ConsultaLotes>[]=[];const service={consultar:vi.fn(()=>{const value=new Subject<ConsultaLotes>();respostas.push(value);return value;})};
 TestBed.configureTestingModule({imports:[HomeModule],providers:[provideRouter([]),provideZoneChangeDetection(),{provide:LotesService,useValue:service}]});
 const fixture=TestBed.createComponent(SeletorLoteComponent);fixture.componentRef.setInput('produtoId',1);fixture.componentRef.setInput('sugerirRetirada',saida);const escolha=vi.fn();fixture.componentInstance.escolha.subscribe(escolha);fixture.autoDetectChanges();
 const responder=async(value=dados(),index=respostas.length-1)=>{TestBed.inject(NgZone).run(()=>{respostas[index].next(value);respostas[index].complete();});await fixture.whenStable();};
 return{fixture,component:fixture.componentInstance,escolha,responder};
}
describe('Sugestão de retirada e confirmação física',()=>{
 it('não escolhe o lote da sugestão até o usuário confirmar, mesmo fora da página',async()=>{
  const{fixture,component,escolha,responder}=preparar();await responder();expect(component.selecionado).toBeNull();expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({id:null,pronto:false}));
  const button=Array.from(fixture.nativeElement.querySelectorAll('button')).find((b:any)=>b.textContent.includes('Conferi o lote físico')) as HTMLButtonElement;expect(button).toBeTruthy();button.click();await fixture.whenStable();expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({id:42,saldo:.125,pronto:true}));
 });
 it('atualizar invalida a escolha anterior e não seleciona uma nova sugestão automaticamente',async()=>{
  const{component,escolha,responder}=preparar();await responder();component.usarSugestao();component.carregar();expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({pronto:false}));await responder(dados({...candidato,lote_id:43,codigo:'PROXIMO'}));expect(component.selecionado).toBeNull();expect(component.confirmou).toBe(false);component.usarSugestao();expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({id:43,pronto:true}));
 });
 it('sem sugestão exige escolha manual e respeita a tela bloqueada',async()=>{
  const{fixture,component,escolha,responder}=preparar();await responder(dados(null));expect(fixture.nativeElement.textContent).toContain('Nenhum lote com saldo');expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({pronto:false}));component.disabled=true;component.selecionar(null);expect(component.confirmou).toBe(false);component.disabled=false;component.selecionar(null);expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({id:null,saldo:1,pronto:true}));
 });
 it('entradas preservam o fluxo existente sem sugerir retirada',async()=>{
  const{fixture,escolha,responder}=preparar(false);await responder();expect(fixture.nativeElement.textContent).not.toContain('Retire primeiro');expect(escolha).toHaveBeenLastCalledWith(expect.objectContaining({id:null,pronto:true}));
 });
});
