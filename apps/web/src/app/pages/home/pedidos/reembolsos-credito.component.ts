import {ChangeDetectionStrategy,Component,Input,Output,EventEmitter,OnDestroy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder,ReactiveFormsModule,Validators} from '@angular/forms';
import {Subscription} from 'rxjs';
import {finalize,timeout} from 'rxjs/operators';
import {MaterialModule} from 'src/app/shared/material/material.module';
import {ComprasService,CreditoDevolucao,ReembolsoDevolucao} from 'src/app/shared/services/compras.service';
import {centavos,validarDinheiro} from 'src/app/shared/utils/dinheiro';
@Component({selector:'app-reembolsos-credito',changeDetection:ChangeDetectionStrategy.Eager,imports:[CommonModule,ReactiveFormsModule,MaterialModule],templateUrl:'./reembolsos-credito.component.html',styles:[`:host{display:block;border:1px solid #dfe5ed;border-radius:8px;padding:16px;margin:12px 0}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}button{min-height:48px;margin:4px}.error{color:#922e26}.history{padding-left:20px}small{display:block;color:#526178}fieldset{border:0;padding:0;min-width:0}`]})
export class ReembolsosCreditoComponent implements OnDestroy{
 @Input({required:true})pedido!:number;@Input({required:true})entrega!:number;@Input({required:true})credito!:CreditoDevolucao;@Output()atualizado=new EventEmitter<void>();
 hoje=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());aberto=false;estorno?:number;saving=false;error='';private key=crypto.randomUUID();private request?:Subscription;private changes:Subscription;
 form=this.fb.nonNullable.group({valor:['',validarDinheiro()],forma:['pix',Validators.required],recebido_em:[this.hoje,Validators.required],documento:['',[Validators.required,Validators.maxLength(120)]],motivo:['',[Validators.required,Validators.minLength(3),Validators.maxLength(450)]]});
 constructor(private fb:FormBuilder,private service:ComprasService){this.changes=this.form.valueChanges.subscribe(()=>this.key=crypto.randomUUID());}
 get pendente(){return this.credito.pendente_centavos??this.credito.valor_centavos;}
 get valido(){return this.estorno!==undefined?this.form.controls.motivo.valid: this.form.valid&&!!centavos(this.form.controls.valor.value)&&centavos(this.form.controls.valor.value)!<=this.pendente&&this.form.controls.recebido_em.value<=this.hoje;}
 jaEstornado(r:ReembolsoDevolucao){return !!this.credito.reembolsos?.some(e=>e.estorno_de_id===r.reembolso_id);}
 preparar(estorno?:number){this.aberto=true;this.estorno=estorno;this.error='';this.form.reset({valor:'',forma:'pix',recebido_em:this.hoje,documento:'',motivo:''});this.key=crypto.randomUUID();}
 enviar(){if(!this.valido||this.saving)return;const v=this.form.getRawValue(),body=this.estorno===undefined?{valor_centavos:centavos(v.valor)!,forma:v.forma,recebido_em:v.recebido_em,documento:v.documento.trim(),motivo:v.motivo.trim()}:{motivo:v.motivo.trim()};this.saving=true;this.error='';this.form.disable({emitEvent:false});this.request=this.service.reembolso(this.pedido,this.entrega,this.credito.credito_id,body,this.key,this.estorno).pipe(timeout(15000),finalize(()=>{this.saving=false;this.form.enable({emitEvent:false});})).subscribe({next:()=>{this.aberto=false;this.atualizado.emit();},error:e=>this.error=e.error?.message||'Falha no registro. Tente novamente com os mesmos dados.'});}
 ngOnDestroy(){this.changes.unsubscribe();this.request?.unsubscribe();}
}
