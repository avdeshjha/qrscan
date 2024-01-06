import { Injectable } from '@angular/core';


import { differenceInYears } from 'date-fns';
import { SymbolType, InputSymbol } from './model.service';

export interface InputValidator {
  symbols: InputSymbol<SymbolType.User>[],
  isValid: boolean,
  validate: (highlight?: boolean) => boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ValidatorService {

  constructor() { }

  getUserInputValidator(symbols: InputSymbol<SymbolType.User>[]): InputValidator {
    return {
      symbols: symbols,
      isValid: false,
      validate: (highlight?: boolean) => {
        //need all parts of required composites
        let valid: boolean = true;
        symbols.forEach(symbol => {

          if (symbol.composites.some(comp => comp.required)) {
            symbol.parts.forEach(part => {
              if (part.skip) return;
              // skip name prefix
              if (symbol.code === '1' && part.code === 'P') {
                return;
              }
              // skip address line 2
              if (symbol.code === '3' && part.code === 'B') {
                return;
              }
              if (!part.value) {
                valid = false;
                if (!!highlight) part.missing = true;
              } else {
                part.missing = false;
              }
              if (!highlight) part.missing = false;

              // console.log('evaluated part: ' + part.text
              //   + ', value: ' + part.value
              //   + ', missing: ' + part.missing
              //   + ', highlight: ' + highlight);

            });
          }
        });



        //calculate available composites
        //AGE - symbol 2, composite 4
        let ageSymbol: InputSymbol<SymbolType.User> = symbols
          .find(symbol => symbol.type === SymbolType.User && symbol.code === '2'
            && symbol.composites.some(c => c.code === '4'));
        if (!!ageSymbol) {
          ageSymbol.composites.find(comp => comp.code === '4').value = this.calcAge(ageSymbol);
        }
        return valid;
      }

    };
  }

  calcAge(ageable: any): string {
    if (!ageable) return null;

    let m: number = +ageable.parts.find(p => p.code === 'M').value;
    let d: number = +ageable.parts.find(p => p.code === 'D').value;
    let y: number = +ageable.parts.find(p => p.code === 'Y').value;

    if (!m || !d || !y) return null;

    let age: number = differenceInYears(new Date(), new Date(y, m, d));

    console.log('Calc age: ' + m + '/' + d + '/' + y + ' = ' + age);
    return age.toString();
  }

}
