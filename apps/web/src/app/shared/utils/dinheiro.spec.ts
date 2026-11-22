import {FormControl} from '@angular/forms';
import {centavos,textoCentavos,validarDinheiro} from './dinheiro';
describe('Contratos monetários',()=>{
 it('converte decimais sem arredondamento binário e respeita o limite',()=>{expect(centavos('0,29')).toBe(29);expect(centavos('10000000000.00')).toBe(1000000000000);expect(textoCentavos(29)).toBe('0.29');});
 it('rejeita casas excedentes, expoentes, negativos e valores acima do contrato',()=>{for(const v of ['1.001','1e2','-1','1.000,00','10000000000.01','',null])expect(centavos(v)).toBeNull();});
 it('valida valores opcionais sem aceitar conteúdo inválido',()=>{expect(validarDinheiro(true)(new FormControl(''))).toBeNull();expect(validarDinheiro()(new FormControl(''))).toBeTruthy();expect(validarDinheiro()(new FormControl('12,34'))).toBeNull();});
});
