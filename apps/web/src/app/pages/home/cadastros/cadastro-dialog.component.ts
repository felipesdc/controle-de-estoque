import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AbstractControl, FormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { CADASTROS, Cadastro, CadastrosService, TipoCadastro } from 'src/app/shared/services/cadastros.service';
@Component({ selector: 'app-cadastro-dialog', templateUrl: './cadastro-dialog.component.html', styleUrls: ['./cadastro-dialog.component.scss'] })
export class CadastroDialogComponent {
  saving=false;error='';
  get config(){return CADASTROS[this.data.tipo];}
  form=this.fb.group({
    nome:[this.data.registro?.nome || '',[Validators.required,Validators.maxLength(CADASTROS[this.data.tipo].limite),(c:AbstractControl)=>typeof c.value==='string'&&c.value.trim()?null:{vazio:true}]],
    contato:[this.data.registro?.contato || '',Validators.maxLength(200)],
    endereco:[this.data.registro?.endereco || '',Validators.maxLength(500)],
  });
  constructor(private fb: FormBuilder, public ref: MatDialogRef<CadastroDialogComponent>, @Inject(MAT_DIALOG_DATA) public data:{tipo:TipoCadastro;registro?:Cadastro;excluir:boolean}, private service:CadastrosService){}
  salvar():void{
    if(this.saving||(!this.data.excluir&&this.form.invalid)) {this.form.markAllAsTouched();return;}
    if(this.data.excluir&&this.data.registro!.total_vinculos)return;
    const values=this.form.getRawValue();
    const payload={nome:values.nome!.trim(),...(this.data.tipo==='fornecedores'?{contato:values.contato?.trim()||'',endereco:values.endereco?.trim()||''}:{})};
    const request: Observable<Cadastro | void>=this.data.excluir?this.service.excluir(this.data.tipo,this.data.registro!.id):this.service.salvar(this.data.tipo,payload,this.data.registro?.id);
    this.saving=true;this.error='';this.ref.disableClose=true;this.form.disable({emitEvent:false});
    request.pipe(finalize(()=>{this.saving=false;this.ref.disableClose=false;this.form.enable({emitEvent:false});})).subscribe({next:()=>this.ref.close(true),error:err=>this.error=err.error?.message||'Não foi possível concluir. Seus dados foram mantidos neste formulário.'});
  }
  cancelar():void{if(!this.saving)this.ref.close();}
}
