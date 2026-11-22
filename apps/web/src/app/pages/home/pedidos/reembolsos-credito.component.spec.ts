import {TestBed} from '@angular/core/testing';
import {of,Subject} from 'rxjs';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {ReembolsosCreditoComponent} from './reembolsos-credito.component';
import {ComprasService} from 'src/app/shared/services/compras.service';
afterEach(()=>TestBed.resetTestingModule());
function preparar(){const service={reembolso:vi.fn((..._args:unknown[])=>new Subject<unknown>())};TestBed.configureTestingModule({imports:[ReembolsosCreditoComponent],providers:[{provide:ComprasService,useValue:service}]});const f=TestBed.createComponent(ReembolsosCreditoComponent),c=f.componentInstance;c.pedido=1;c.entrega=2;c.credito={credito_id:3,valor_centavos:1000,documento:'NC 1',motivo:'Avaria',data:'2026-11-21',reembolsado_centavos:800,pendente_centavos:200,reembolsos:[]};return{f,c,service};}
describe('Reembolsos de créditos comerciais',()=>{
 it('limita ao crédito pendente e converte centavos exatamente',()=>{const{c,service}=preparar();c.preparar();c.form.patchValue({valor:'2,01',documento:'PIX 1',motivo:'Pagamento parcial'});expect(c.valido).toBe(false);c.enviar();expect(service.reembolso).not.toHaveBeenCalled();c.form.patchValue({valor:'0,29'});expect(c.valido).toBe(true);c.enviar();expect(service.reembolso.mock.calls[0][3]).toMatchObject({valor_centavos:29,forma:'pix'});expect(c.form.disabled).toBe(true);});
 it('mantém a mesma chave após erro de rede e não envia duas vezes enquanto aguarda',()=>{const{c,service}=preparar(),request=new Subject<unknown>();service.reembolso.mockReturnValueOnce(request);c.preparar();c.form.patchValue({valor:'1,00',documento:'PIX 1',motivo:'Recebimento parcial'});c.enviar();c.enviar();expect(service.reembolso).toHaveBeenCalledTimes(1);const key=service.reembolso.mock.calls[0][4];request.error({});c.enviar();expect(service.reembolso.mock.calls[1][4]).toBe(key);});
 it('exige motivo para corrigir e preserva o recebimento original',()=>{const{c,service}=preparar();c.preparar(9);expect(c.valido).toBe(false);c.form.controls.motivo.setValue('Comprovante duplicado');expect(c.valido).toBe(true);c.enviar();expect(service.reembolso.mock.calls[0][3]).toEqual({motivo:'Comprovante duplicado'});expect(service.reembolso.mock.calls[0][5]).toBe(9);});
});
