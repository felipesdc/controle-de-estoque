import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {of,Subject} from 'rxjs';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {HomeModule} from '../home.module';
import {OperarEstoqueComponent} from './operar-estoque.component';
import {ProdutoService} from 'src/app/shared/services/produto.service';
import {MovimentacaoEstoqueService} from 'src/app/shared/services/movimentacao-estoque.service';
import {AuthService} from 'src/app/shared/services/auth.service';
afterEach(()=>TestBed.resetTestingModule());
describe('Contrato do leitor em modo teclado',()=>{
 it('preserva zeros, impede leitura concorrente e nunca movimenta com Enter repetido',()=>{const resposta=new Subject<any>(),produtos={getCatalogo:()=>of({itens:[],total:0}),getProdutoPorCodigo:vi.fn(()=>resposta)},estoque={createNewMovimentacaoEstoque:vi.fn()};TestBed.configureTestingModule({imports:[HomeModule],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting(),{provide:ProdutoService,useValue:produtos},{provide:MovimentacaoEstoqueService,useValue:estoque},{provide:AuthService,useValue:{podeOperarEstoque:()=>true}}]});const f=TestBed.createComponent(OperarEstoqueComponent),c=f.componentInstance;f.detectChanges();c.mudarModo('codigo');f.detectChanges();const input=f.nativeElement.querySelector('input[autocomplete="off"]') as HTMLInputElement;input.value='0000123456789';input.dispatchEvent(new Event('input',{bubbles:true}));const form=input.closest('form')!;form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));c.lerCodigo();expect(produtos.getProdutoPorCodigo).toHaveBeenCalledTimes(1);expect(produtos.getProdutoPorCodigo).toHaveBeenCalledWith('0000123456789');resposta.next({produto_id:1,produto_descricao:'Produto leitor',produto_codigo_barras:'0000123456789',produto_quantidade_estoque:3,produto_estado:true});resposta.complete();c.lerCodigo();c.confirmar();expect(c.selecionado?.produto_id).toBe(1);expect(c.revisando).toBe(false);expect(estoque.createNewMovimentacaoEstoque).not.toHaveBeenCalled();});
});
