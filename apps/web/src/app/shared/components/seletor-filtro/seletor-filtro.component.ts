import {Component,Input,forwardRef,OnDestroy,OnInit,ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl,ControlValueAccessor,FormControl,NG_VALIDATORS,NG_VALUE_ACCESSOR,ReactiveFormsModule,ValidationErrors,Validator} from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import {MatFormFieldModule} from '@angular/material/form-field';
import {Subscription} from 'rxjs';
import {SeletorCadastroComponent} from '../seletor-cadastro/seletor-cadastro.component';
@Component({selector:'app-seletor-filtro',changeDetection:ChangeDetectionStrategy.Eager,imports:[CommonModule,ReactiveFormsModule,MatSelectModule,MatFormFieldModule,SeletorCadastroComponent],providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SeletorFiltroComponent),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>SeletorFiltroComponent),multi:true}],template:`<mat-form-field appearance="outline"><mat-label>{{label}}</mat-label><mat-select [formControl]="modo"><mat-option value="">Todos</mat-option><mat-option *ngIf="especial" [value]="especial">{{rotuloEspecial}}</mat-option><mat-option value="especifico">Escolher {{label.toLowerCase()}}</mat-option></mat-select></mat-form-field><app-seletor-cadastro *ngIf="modo.value==='especifico'" [tipo]="tipo" [label]="label" [formControl]="id"></app-seletor-cadastro>`,styles:[`:host{display:block;min-width:220px;max-width:100%}mat-form-field{width:100%}`]})
export class SeletorFiltroComponent implements ControlValueAccessor,Validator,OnInit,OnDestroy{
 @Input({required:true})tipo!:SeletorCadastroComponent['tipo'];@Input()label='Categoria';@Input()especial='';@Input()rotuloEspecial='';
 modo=new FormControl('',{nonNullable:true});id=new FormControl<number|null>(null);private subscriptions=new Subscription();private atual='';private emitir(v:string){if(v!==this.atual){this.atual=v;this.mudar(v);}}private mudar:(v:string)=>void=()=>{};private tocar=()=>{};private revalidar=()=>{};
 ngOnInit(){this.subscriptions.add(this.modo.valueChanges.subscribe(v=>{this.id.setValue(null,{emitEvent:false});this.emitir(v==='especifico'?'':v);this.tocar();this.revalidar();}));this.subscriptions.add(this.id.valueChanges.subscribe(v=>{if(this.modo.value==='especifico'){this.emitir(v===null?'':String(v));this.tocar();this.revalidar();}}));this.subscriptions.add(this.id.statusChanges.subscribe(()=>this.revalidar()));}
 writeValue(v:string|null){this.atual=v||'';const n=Number(v);const especifico=!!v&&/^\d+$/.test(v)&&Number.isSafeInteger(n)&&n>0;this.modo.setValue(especifico?'especifico':v||'',{emitEvent:false});this.id.setValue(especifico?n:null,{emitEvent:false});}
 registerOnChange(fn:(v:string)=>void){this.mudar=fn;}registerOnTouched(fn:()=>void){this.tocar=fn;}registerOnValidatorChange(fn:()=>void){this.revalidar=fn;}
 setDisabledState(v:boolean){for(const c of [this.modo,this.id])v?c.disable({emitEvent:false}):c.enable({emitEvent:false});}
 validate(_c:AbstractControl):ValidationErrors|null{return this.modo.value==='especifico'&&(this.id.value===null||this.id.invalid)?{selecaoFiltroInvalida:true}:null;}
 ngOnDestroy(){this.subscriptions.unsubscribe();}
}
