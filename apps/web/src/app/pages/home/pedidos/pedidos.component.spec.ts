import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {HomeModule} from '../home.module';
import {PedidosComponent} from './pedidos.component';
import {ComprasService} from 'src/app/shared/services/compras.service';
import {AuthService} from 'src/app/shared/services/auth.service';
afterEach(()=>TestBed.resetTestingModule());
function preparar(){
 const service={listar:vi.fn(()=>of({itens:[],total:0,pagina:1})),transicao:vi.fn((..._args:unknown[])=>of({pedido_id:1})),credito:vi.fn(()=>of({credito_id:1})),obter:vi.fn(()=>of({pedido_id:1}))};
 TestBed.configureTestingModule({imports:[HomeModule],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:ComprasService,useValue:service},{provide:AuthService,useValue:{isAdmin:()=>true,isGerente:()=>false}}]});
 const fixture=TestBed.createComponent(PedidosComponent),c=fixture.componentInstance;c.ngOnInit();return {c,service};
}
describe('Custos gerenciais do recebimento',()=>{
 it('bloqueia IBS/CBS recuperáveis no Simples até informar a opção regular e a referência',()=>{const {c}=preparar();c.preparar('receber');c.tributos.push(c.tributo());c.tributos.at(0).patchValue({codigo:'CBS',tratamento:'recuperavel_incluso',valor:'0,29'});expect(c.custosValidos).toBe(false);c.custosForm.patchValue({referencia:'NF 1'});expect(c.custosValidos).toBe(false);c.custosForm.patchValue({regular:true});expect(c.custosValidos).toBe(true);c.custosForm.patchValue({frete:'1.001'});expect(c.custosValidos).toBe(false);});
 it('envia valores exatos e rejeita quantidade inválida antes da requisição',()=>{const {c,service}=preparar();c.detalhe={pedido_id:1,pedido_versao:2,itens:[{item_pedido_id:10,produto:'Teste',quantidade_pendente:2,lotes_devolviveis:[]}]} as any;c.preparar('receber');c.custosForm.patchValue({frete:'0,29'});c.linhasEntrega[0].quantidade=.0001;c.executar();expect(service.transicao).not.toHaveBeenCalled();c.linhasEntrega[0].quantidade=1;c.executar();expect(service.transicao.mock.calls[0][4]).toMatchObject({custos:{frete_centavos:29,regime:'simples',ibs_cbs_regular:false}});});
 it('reinicia os custos a cada recebimento, sem transportar frete de outra entrega',()=>{const {c}=preparar();c.preparar('receber');c.custosForm.patchValue({frete:'55,50',regular:true});c.tributos.push(c.tributo());c.preparar('receber');expect(c.custosForm.controls.frete.value).toBe('0.00');expect(c.tributos.length).toBe(0);expect(c.custosForm.controls.regular.value).toBe(false);});
});
