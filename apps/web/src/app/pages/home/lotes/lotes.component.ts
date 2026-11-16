import { Component,OnInit,OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ProdutoService } from 'src/app/shared/services/produto.service';
import { ProdutoCatalogo } from 'src/app/shared/models/catalogo.model';
@Component({standalone:false,selector:'app-lotes',template:`<section class="lotes"><h1>Lotes e validades</h1><p>O saldo anterior permanece sem lote identificado. A validade cadastrada no produto não é atribuída aos lotes.</p><div class="filtros"><mat-form-field appearance="outline"><mat-label>Buscar produto</mat-label><input matInput [(ngModel)]="q" maxlength="100" (keydown.enter)="buscar()"></mat-form-field><button mat-stroked-button (click)="buscar()" [disabled]="loading">Buscar</button></div><p role="alert" *ngIf="error">{{error}}</p><p role="status" *ngIf="loading">Buscando…</p><p *ngIf="total>10">Mostrando 10 de {{total}} produtos. Refine a busca.</p><div class="filtros"><button mat-stroked-button *ngFor="let p of produtos" (click)="produtoId=p.produto_id">{{p.produto_descricao}}</button></div><app-seletor-lote [produtoId]="produtoId" [consulta]="true"></app-seletor-lote></section>`,styleUrl:'./lotes.component.scss'})
export class LotesComponent implements OnInit,OnDestroy {
 q='';produtoId:number|null=null;produtos:ProdutoCatalogo[]=[];total=0;loading=false;error='';private request?:Subscription;
 constructor(private service:ProdutoService,private route:ActivatedRoute){}
 ngOnInit(){const id=Number(this.route.snapshot.queryParamMap.get('produto'));if(Number.isSafeInteger(id)&&id>0)this.produtoId=id;else this.buscar();}
 buscar(){this.request?.unsubscribe();this.error='';this.loading=true;this.request=this.service.getCatalogo({q:this.q,pagina:1,tamanho:10,estado:'todos'}).subscribe({next:d=>{this.produtos=d.itens;this.total=d.total;this.loading=false;},error:e=>{this.produtos=[];this.total=0;this.loading=false;this.error=e.error?.message||'Falha ao buscar produtos.';}});}
 ngOnDestroy(){this.request?.unsubscribe();}
}
