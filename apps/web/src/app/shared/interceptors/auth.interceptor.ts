import { Injectable } from '@angular/core';
import { HttpInterceptor,HttpRequest,HttpHandler,HttpEvent } from '@angular/common/http';
import { Observable,throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { SessionStateService } from '../services/session-state.service';
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private session:SessionStateService){}
  intercept(req:HttpRequest<any>,next:HttpHandler):Observable<HttpEvent<any>>{
    const api=req.url===environment.apiurl||req.url.startsWith(environment.apiurl+'/');
    const login=req.url===`${environment.apiurl}/usuario/login`;
    if(!api||login)return next.handle(req);
    const token=req.headers.get('Authorization')?.replace(/^Bearer /,'')||this.session.token();
    const request=token?req.clone({setHeaders:{Authorization:`Bearer ${token}`}}):req;
    return next.handle(request).pipe(catchError(error=>{if(error.status===401&&token&&this.session.token()===token)this.session.encerrar('expirada');return throwError(error);}));
  }
}
