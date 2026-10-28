import { Injectable } from '@angular/core';
import { HttpClient,HttpParams } from '@angular/common/http';
import { timeout } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
export interface UsuarioAcesso {usuario_id:number;usuario_nome:string;usuario_email:string;usuario_nome_completo:string;usuario_perfil_id:number;usuario_perfil_nome:string;usuario_status:boolean;usuario_inscricao:string;}
export interface PerfilAcesso {perfil_id:number;perfil_nome:string;nivel:string;protegido:boolean;usuarios:number;}
export interface PaginaUsuarios {itens:UsuarioAcesso[];total:number;pagina:number;tamanho:number;}
@Injectable({providedIn:'root'})
export class AcessosService {
  constructor(private http:HttpClient){}
  usuarios(filtros:Record<string,string|number>){let params=new HttpParams();Object.entries(filtros).forEach(([k,v])=>params=params.set(k,String(v)));return this.http.get<PaginaUsuarios>(`${environment.apiurl}/acessos/usuarios`,{params}).pipe(timeout(15000));}
  perfis(){return this.http.get<PerfilAcesso[]>(`${environment.apiurl}/acessos/perfis`).pipe(timeout(15000));}
  salvarUsuario(dados:Record<string,unknown>,id?:number){return id?this.http.patch<UsuarioAcesso>(`${environment.apiurl}/acessos/usuarios/${id}`,dados).pipe(timeout(15000)):this.http.post<UsuarioAcesso>(`${environment.apiurl}/acessos/usuarios`,dados);}
  salvarPerfil(nome:string,id?:number){const body={perfil_nome:nome};return id?this.http.put(`${environment.apiurl}/perfil/${id}`,body).pipe(timeout(15000)):this.http.post(`${environment.apiurl}/perfil`,body);}
  excluirPerfil(id:number){return this.http.delete(`${environment.apiurl}/perfil/${id}`).pipe(timeout(15000));}
}
