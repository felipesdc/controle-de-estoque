import {AbstractControl,ValidationErrors} from '@angular/forms';
export const LIMITE_CENTAVOS=1_000_000_000_000;
// Decimal text is the boundary: never round a binary floating-point monetary input.
export function centavos(value:unknown):number|null {
 if(typeof value!=='string')return null;
 const text=value.trim();if(!/^\d+(?:[.,]\d{1,2})?$/.test(text)||text.length>20)return null;
 const [inteiro,fracao='']=text.replace(',','.').split('.');const n=BigInt(inteiro)*100n+BigInt(fracao.padEnd(2,'0'));
 return n<=BigInt(LIMITE_CENTAVOS)?Number(n):null;
}
export function textoCentavos(value:number|null):string {if(value===null)return '';const n=BigInt(value);return (n/100n).toString()+'.'+(n%100n).toString().padStart(2,'0');}
export function validarDinheiro(opcional=false){return(c:AbstractControl):ValidationErrors|null=>opcional&&(c.value===null||c.value==='')?null:centavos(c.value)===null?{dinheiro:true}:null;}
