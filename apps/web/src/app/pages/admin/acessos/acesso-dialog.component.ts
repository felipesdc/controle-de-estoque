import { Component,Inject,OnInit } from '@angular/core';
import { FormBuilder,Validators,AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA,MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AcessosService,UsuarioAcesso,PerfilAcesso } from 'src/app/shared/services/acessos.service';
import { AuthService } from 'src/app/shared/services/auth.service';
@Component({selector:'app-acesso-dialog',templateUrl:'./acesso-dialog.component.html',styles:['form { display:flex;flex-direction:column;gap:8px;margin-top:16px; } p {font-size:12px;line-height:1.7;color:#687d70;} .error {color:#a74337;background:#fff0ed;padding:12px;border-radius:8px;} mat-dialog-actions {padding:12px 24px 20px;}']})
export class AcessoDialogComponent implements OnInit {
  saving=false;error='';nomePerfil=this.fb.control(this.data.perfil?.perfil_nome||'',[Validators.required,Validators.maxLength(80)]);
  form=this.fb.group({usuario_operar_estoque:[this.data.usuario?.usuario_operar_estoque??false],usuario_nome:[this.data.usuario?.usuario_nome||'',[Validators.required,Validators.pattern(/^[A-Za-z0-9._-]{3,50}$/)]],usuario_nome_completo:[this.data.usuario?.usuario_nome_completo||'',[Validators.required,Validators.maxLength(200)]],usuario_email:[this.data.usuario?.usuario_email||'',[Validators.required,Validators.pattern(/^[^\s@]+@[^\s@]+$/),Validators.maxLength(254)]],usuario_perfil_id:[this.data.usuario?.usuario_perfil_id||3,Validators.required],usuario_status:[this.data.usuario?.usuario_status??true],usuario_password:['',(c:AbstractControl)=>!c.value&&this.data.usuario?null:typeof c.value==='string'&&c.value.length>=12&&new TextEncoder().encode(c.value).length<=72?null:{senha:true}]});
  get proprio(){return this.data.usuario?.usuario_id===this.auth.session.claims()?.usuario_id;}
  constructor(private fb:FormBuilder,public ref:MatDialogRef<AcessoDialogComponent>,@Inject(MAT_DIALOG_DATA)public data:{tipo:string;usuario?:UsuarioAcesso;perfil?:PerfilAcesso;perfis:PerfilAcesso[];acao?:string},private service:AcessosService,public auth:AuthService){}
  ngOnInit():void{if(this.proprio){this.form.controls.usuario_perfil_id.disable();this.form.controls.usuario_status.disable();}}
  salvar():void{
    if(this.saving)return;
    let request:Observable<unknown>;let selfPasswordChanged=false;
    if(this.data.tipo==='perfil'){if(this.data.acao==='excluir')request=this.service.excluirPerfil(this.data.perfil!.perfil_id);else{if(this.nomePerfil.invalid||!this.nomePerfil.value?.trim())return;request=this.service.salvarPerfil(this.nomePerfil.value.trim(),this.data.perfil?.perfil_id);}}
    else if(this.data.acao==='estado')request=this.service.salvarUsuario({usuario_status:!this.data.usuario!.usuario_status},this.data.usuario!.usuario_id);
    else{if(this.form.invalid){this.form.markAllAsTouched();return;}const values=this.form.getRawValue();const dados:Record<string,unknown>={};Object.entries(values).forEach(([k,v])=>{if(k==='usuario_password'&&!v)return;if(!this.data.usuario||this.form.get(k)?.dirty)dados[k]=typeof v==='string'&&k!=='usuario_password'?v.trim():v;});if(!Object.keys(dados).length)return;selfPasswordChanged=this.proprio&&!!dados.usuario_password;request=this.service.salvarUsuario(dados,this.data.usuario?.usuario_id);}
    this.saving=true;this.error='';this.ref.disableClose=true;this.form.disable({emitEvent:false});this.nomePerfil.disable({emitEvent:false});
    request.pipe(finalize(()=>{this.saving=false;this.ref.disableClose=false;this.form.enable({emitEvent:false});this.nomePerfil.enable({emitEvent:false});if(this.proprio){this.form.controls.usuario_perfil_id.disable();this.form.controls.usuario_status.disable();}})).subscribe({next:()=>{this.ref.close({selfPasswordChanged});if(selfPasswordChanged)this.auth.session.encerrar('atualizada');},error:e=>this.error=e.error?.message||'Não foi possível salvar. Os dados preenchidos foram mantidos.'});
  }
}
