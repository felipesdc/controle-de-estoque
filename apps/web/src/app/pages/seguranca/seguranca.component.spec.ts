import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController,provideHttpClientTesting} from '@angular/common/http/testing';
import {NgZone,provideZoneChangeDetection} from '@angular/core';
import {SegurancaComponent} from './seguranca.component';
import {SessionStateService} from 'src/app/shared/services/session-state.service';
import {environment} from 'src/environments/environment';
import {afterEach,describe,it,expect} from 'vitest';
describe('Atualização assíncrona da segurança',()=>{
 afterEach(()=>TestBed.resetTestingModule());
 it('mostra MFA após a resposta HTTP sem clique nem detectChanges adicional',async()=>{
  TestBed.configureTestingModule({imports:[SegurancaComponent],providers:[provideZoneChangeDetection(),provideHttpClient(),provideHttpClientTesting(),{provide:SessionStateService,useValue:{}}]});
  const fixture=TestBed.createComponent(SegurancaComponent);fixture.autoDetectChanges();
  await fixture.whenStable();
  TestBed.inject(NgZone).run(()=>TestBed.inject(HttpTestingController).expectOne(environment.apiurl+'/seguranca').flush({mfa_disponivel:true,mfa_ativo:false,codigos_restantes:0,eventos:[]}));
  await fixture.whenStable();
  expect(fixture.nativeElement.textContent).toContain('Autenticação em dois fatores');
  expect(fixture.nativeElement.textContent).toContain('Ainda não ativada.');
  TestBed.inject(HttpTestingController).verify();
 });
});
