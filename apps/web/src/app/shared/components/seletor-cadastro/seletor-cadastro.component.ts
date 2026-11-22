import {ChangeDetectionStrategy,Component,EventEmitter,forwardRef,Input,OnDestroy,OnInit,Output,signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractControl,ControlValueAccessor,FormControl,NG_VALIDATORS,NG_VALUE_ACCESSOR,ReactiveFormsModule,ValidationErrors,Validator} from '@angular/forms';
import {HttpClient,HttpParams} from '@angular/common/http';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {Subject,of,timer} from 'rxjs';
import {catchError,map,switchMap,takeUntil,timeout} from 'rxjs/operators';
import {environment} from 'src/environments/environment';
import {TipoCadastro} from '../../services/cadastros.service';
export interface OpcaoCadastro {id:number;nome:string;}
interface Pagina {itens:OpcaoCadastro[];total:number;pagina:number;tamanho:number;selecionado:OpcaoCadastro|null;}
interface Busca {q:string;pagina:number;selecionado:number|null;hidratar:boolean;delay:number;}
@Component({
  selector:'app-seletor-cadastro',
  changeDetection:ChangeDetectionStrategy.OnPush,
  imports:[CommonModule,ReactiveFormsModule,MatAutocompleteModule,MatButtonModule,MatFormFieldModule,MatInputModule],
  providers:[{provide:NG_VALUE_ACCESSOR,useExisting:forwardRef(()=>SeletorCadastroComponent),multi:true},{provide:NG_VALIDATORS,useExisting:forwardRef(()=>SeletorCadastroComponent),multi:true}],
  template:`<mat-form-field appearance="outline"><mat-label>{{label}}</mat-label><input matInput [formControl]="texto" [matAutocomplete]="opcoes" (blur)="tocar()" (input)="digitar($event)" autocomplete="off" maxlength="100" [attr.aria-label]="label+' — digite para buscar'" [attr.aria-describedby]="ajudaId"><mat-autocomplete #opcoes="matAutocomplete" [displayWith]="mostrar" [requireSelection]="true" (optionSelected)="escolher($event.option.value)"><mat-option [value]="null">{{vazio}}</mat-option><mat-option *ngFor="let item of pagina().itens;trackBy:porId" [value]="item">{{item.nome}}</mat-option><mat-option *ngIf="!carregando()&&!pagina().itens.length" disabled>Nenhum resultado</mat-option></mat-autocomplete></mat-form-field>
    <div class="status" [id]="ajudaId" role="status"><span *ngIf="carregando()">Buscando opções…</span><span *ngIf="!carregando()&&!erro()">{{pagina().total}} opções · página {{pagina().pagina}} de {{paginas()}}. Digite para filtrar e selecione uma opção.</span><span *ngIf="erro()">{{erro()}}</span></div>
    <div class="actions"><button mat-button type="button" *ngIf="erro()" (click)="buscar()" [disabled]="desabilitado()">Tentar novamente</button><button mat-button type="button" *ngIf="valor()!==null" (click)="limpar()" [disabled]="desabilitado()">Limpar {{label.toLowerCase()}}</button><ng-container *ngIf="pagina().total>pagina().tamanho"><button mat-stroked-button type="button" (click)="ir(-1)" [disabled]="desabilitado()||carregando()||pagina().pagina<=1" [attr.aria-label]="'Página anterior de '+label">Anterior</button><button mat-stroked-button type="button" (click)="ir(1)" [disabled]="desabilitado()||carregando()||pagina().pagina>=paginas()" [attr.aria-label]="'Próxima página de '+label">Próxima</button></ng-container></div>`,
  styles:[`:host{display:block;min-width:0}mat-form-field{width:100%}.status{font-size:12px;line-height:1.5;color:#526578;min-height:2em}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px}.actions button{min-height:48px}`],
})
export class SeletorCadastroComponent implements ControlValueAccessor,Validator,OnInit,OnDestroy {
  private static sequencia=0;
  readonly ajudaId='ajuda-cadastro-'+(++SeletorCadastroComponent.sequencia);
  @Input({required:true}) tipo!:TipoCadastro|'produtos'|'produtos-historico'|'responsaveis';
  @Input() label='Cadastro';
  @Input() vazio='Não informado';
  @Output() opcaoChange=new EventEmitter<OpcaoCadastro|null>();
  readonly texto=new FormControl<string|OpcaoCadastro|null>(null);
  readonly valor=signal<number|null>(null);
  readonly carregando=signal(false);
  readonly erro=signal('');
  readonly desabilitado=signal(false);
  readonly pagina=signal<Pagina>({itens:[],total:0,pagina:1,tamanho:25,selecionado:null});
  private pronto=false;private q='';private consultas=new Subject<Busca>();private fim=new Subject<void>();
  private mudar:(id:number|null)=>void=()=>{};private tocado=()=>{};private validarNovamente=()=>{};
  constructor(private http:HttpClient){}
  ngOnInit():void{
    this.pronto=true;
    this.consultas.pipe(switchMap(busca=>timer(busca.delay).pipe(switchMap(()=>{
      let params=new HttpParams().set('q',busca.q).set('pagina',busca.pagina);
      if(busca.selecionado!==null)params=params.set('selecionado',busca.selecionado);
      const path=this.tipo==='produtos-historico'?'movimentacao-estoque/opcoes/produtos':this.tipo==='responsaveis'?'movimentacao-estoque/opcoes/responsaveis':this.tipo==='produtos'?'catalogo/produtos/opcoes':'cadastros/'+this.tipo+'/opcoes';
      return this.http.get<Pagina>(`${environment.apiurl}/${path}`,{params}).pipe(timeout(15000));
    }),map(pagina=>({pagina,busca,erro:''})),catchError(()=>of({pagina:null,busca,erro:'Não foi possível carregar as opções.'})))),takeUntil(this.fim)).subscribe(resultado=>{
      this.carregando.set(false);this.erro.set(resultado.erro);
      if(resultado.pagina){this.pagina.set(resultado.pagina);if(resultado.busca.hidratar){const selecionado=resultado.pagina.selecionado;this.texto.setValue(selecionado,{emitEvent:false});this.opcaoChange.emit(selecionado);if(this.valor()!==null&&!selecionado)this.erro.set('O cadastro selecionado não existe mais. Escolha outro ou limpe o campo.');}}
      this.validarNovamente();
    });
    this.texto.valueChanges.pipe(takeUntil(this.fim)).subscribe(value=>{
      if(typeof value==='string'){this.valor.set(null);this.mudar(null);this.opcaoChange.emit(null);this.q=value;this.consultar(1,false,250);}
      else this.escolher(value);
    });
    this.consultar(1,true);
  }
  readonly mostrar=(value:OpcaoCadastro|string|null)=>typeof value==='string'?value:value?.nome||'';
  readonly porId=(_index:number,item:OpcaoCadastro)=>item.id;
  paginas(){return Math.max(1,Math.ceil(this.pagina().total/this.pagina().tamanho));}
  private consultar(pagina:number,hidratar=false,delay=0){if(!this.pronto)return;this.carregando.set(true);this.erro.set('');this.validarNovamente();this.consultas.next({q:this.q,pagina,selecionado:this.valor(),hidratar,delay});}
  buscar(){this.consultar(this.pagina().pagina,this.valor()!==null);}
  ir(delta:number){this.consultar(this.pagina().pagina+delta);}
  escolher(item:OpcaoCadastro|null){this.erro.set('');this.valor.set(item?.id??null);this.texto.setValue(item,{emitEvent:false});this.mudar(this.valor());this.tocado();this.opcaoChange.emit(item);this.validarNovamente();}
  limpar(){this.q='';this.escolher(null);this.consultar(1);}
  digitar(event:Event){this.texto.setValue((event.target as HTMLInputElement).value);}
  tocar(){this.tocado();}
  writeValue(value:number|null):void{this.valor.set(value??null);this.q='';this.texto.setValue(null,{emitEvent:false});this.consultar(1,true);}
  registerOnChange(fn:(value:number|null)=>void){this.mudar=fn;}
  registerOnTouched(fn:()=>void){this.tocado=fn;}
  setDisabledState(disabled:boolean){this.desabilitado.set(disabled);if(disabled)this.texto.disable({emitEvent:false});else this.texto.enable({emitEvent:false});}
  validate(_control:AbstractControl):ValidationErrors|null{return this.carregando()||this.erro()?{opcoesIndisponiveis:true}:null;}
  registerOnValidatorChange(fn:()=>void){this.validarNovamente=fn;}
  ngOnDestroy(){this.fim.next();this.fim.complete();}
}
