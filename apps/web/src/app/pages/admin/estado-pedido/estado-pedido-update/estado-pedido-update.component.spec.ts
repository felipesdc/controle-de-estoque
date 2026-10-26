import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoPedidoUpdateComponent } from './estado-pedido-update.component';

describe('EstadoPedidoUpdateComponent', () => {
  let component: EstadoPedidoUpdateComponent;
  let fixture: ComponentFixture<EstadoPedidoUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstadoPedidoUpdateComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EstadoPedidoUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
