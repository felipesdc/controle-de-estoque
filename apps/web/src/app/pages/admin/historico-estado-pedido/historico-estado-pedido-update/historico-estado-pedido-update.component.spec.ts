import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoricoEstadoPedidoUpdateComponent } from './historico-estado-pedido-update.component';

describe('HistoricoEstadoPedidoUpdateComponent', () => {
  let component: HistoricoEstadoPedidoUpdateComponent;
  let fixture: ComponentFixture<HistoricoEstadoPedidoUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HistoricoEstadoPedidoUpdateComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HistoricoEstadoPedidoUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
