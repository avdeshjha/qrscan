import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { PopoverController } from '@ionic/angular';

import { CompositeDescPopoverComponent } from '../composite-desc-popover/composite-desc-popover.component';
import { Composite, SymbolType, Part, InputSymbol, ModelService } from 'src/app/services/model.service';
import { Symbol } from 'src/app/services/model.service';

import { DatabaseService } from 'src/app/services/database.service';

import { format, parse } from 'date-fns';
import { CalSelectPopoverComponent } from '../cal-select-popover/cal-select-popover.component';

interface PartInput {
  part: Part, //can also be InputPart when created from scan.ts
  type: InputType,
  blur(value?: string): (string?) => null,
}

enum InputType {
  TEXT,
  DATE,
  CAL,
  PHONE,
  PREF,
  EMAIL,
  GENDER
}

@Component({
  selector: 'symbol',
  templateUrl: './symbol.component.html',
  styleUrls: ['./symbol.component.scss']
})
export class SymbolComponent implements OnInit {

  //constant
  InputType: any = InputType;
  dateFmt: string = 'MMMM DD, YYYY';

  symbolAlert: boolean = false;
  composites: Composite[];
  parts: PartInput[];

  pref: string;
  prefPart: Part;

  constructor(
    public database: DatabaseService,
    public popoverController: PopoverController,
    public model: ModelService,
  ) { }

  @Input()
  public symbol: InputSymbol<any>;

  @Input()
  public isApprovalPage: boolean;

  @Input()
  public readOnly: Boolean;

  @Output()
  public validate = new EventEmitter<void>();

  async ngOnInit() {
    let symbol = this.symbol;
    this.symbolAlert = !!symbol.composites.find(comp => comp.code === this.symbol.code).alert;
    this.composites = this.symbol.composites
      .filter(comp => !!comp.partCodes)
      .filter(comp => comp.code !== this.symbol.code);

    this.parts = this.symbol.parts
      .filter(p => !p.skip)
      .filter(p => {
        //skip individual date parts:
        // - day of birth:
        if (symbol.type === SymbolType.User && symbol.code === '2') return false;

        //skip preference part:
        if (p.code === '8' || p.code === '9') return false;

        return true;
      }).map(p => { //implied if(symbol.type === SymbolType.user && ...)

        if (symbol.code === '_email') { //have pref
          if (!this.missingDataMode()) this.prefPart = symbol.parts.find(p => p.code === '9');
          return {
            part: p,
            type: InputType.EMAIL,
            blur: (async (value: string) => {
              // console.log('email blur');
              this.inputStop();
            }).bind(this),
          }

        } else if (symbol.code === '_phone') { //have pref
          if (!this.missingDataMode()) this.prefPart = symbol.parts.find(p => p.code === '8');
          return {
            part: p,
            type: InputType.PHONE,
            blur: (async (value: string) => {
              // console.log('phone blur');
              this.inputStop();
            }).bind(this),
          }

        } else if (symbol.code === 'G') { //gender
          return {
            part: p,
            type: InputType.GENDER,
            blur: (async (value: string) => {
              // console.log('gender blur');
              this.inputStop();
            }).bind(this)
          }
        } else { // normal text
          return {
            part: p,
            type: InputType.TEXT,
            blur: (async (value: string) => {
              // console.log('text blur');
              this.inputStop();
            }).bind(this)
          }
        }
      });

    if (!!this.prefPart) {
      this.pref = this.prefPart.value;
    }

    if (symbol.code === '2') { //dob 
      let p = {
        missing: this.hasMissingPart(symbol),
        value: this.readDateFromSymbol(symbol),
        text: '[Select Date of Birth]',
        code: null,
        jsonKey: null
      }
      this.parts.push({
        part: p,
        type: InputType.DATE,
        blur: (async (value: string) => {
          // console.log('dob blur');
          this.symbol = this.writeDateToSymbol(this.symbol, value);
          await this.inputStop();
        }).bind(this)
      });
    }

  }

  async prefSelect(event) {
    //this.pref = event.detail.value;
    this.prefPart.value = event.detail.value;
    await this.inputStop();
  }

  hasMissingPart(symbol: InputSymbol<any>): boolean {
    return symbol.parts.some(p => !!p.missing);
  }

  readDateFromSymbol(symbol: Symbol<SymbolType.User>): string {
    // console.log('read date from symbol:');
    // console.table(symbol);
    let m: number = +symbol.parts.find(p => p.code === 'M').value;
    let d: number = +symbol.parts.find(p => p.code === 'D').value;
    let y: number = +symbol.parts.find(p => p.code === 'Y').value;
    if (!!m) m--;
    // console.log('M: ' + m + ', D: ' + d + ', Y: ' + y);
    if (!!m || !!d || !!y) {
      return (new Date(y, m, d)).toISOString();
    }
    // console.log('unable to read date from symbol')
    return null;
  }

  writeDateToSymbol(symbol: Symbol<SymbolType.User>, dateStr: string): Symbol<SymbolType.User> {
    let date: Date = parse(dateStr);
    let m: string = format(date, 'MM');
    let d: string = format(date, 'DD');
    let y: string = format(date, 'YYYY');

    symbol.parts.forEach(p => {
      switch (p.code) {
        case 'M':
          if (!!m) p.value = m;
          break;
        case 'D':
          if (!!d) p.value = d;
          break;
        case 'Y':
          if (!!y) p.value = y;
          break;
        default:
          break;
      }
    });

    return symbol;

    //this.inputStop();
  }

  missingDataMode() {
    return this.validate.observers.length > 0;
  }

  async compositeInfo(event: any, comp: Composite) {
    const popover = await this.popoverController.create({
      component: CompositeDescPopoverComponent,
      event: event,
      translucent: true,
      cssClass: "composite-popover",
      componentProps: {
        symbol: this.symbol,
        comp: comp
      }
    });
    return await popover.present();
  }

  async selectCal(event: any, part: Part) {
    const popover = await this.popoverController.create({
      component: CalSelectPopoverComponent,
      //event: event,
      translucent: true,
      cssClass: "cal-select-popover",
      componentProps: {
      }
    });

    popover.onDidDismiss().then(async (dataReturned) => {
      if (dataReturned !== null) {
        part.value = dataReturned.data;
        await this.inputStop();
      }
    });
    return await popover.present();

  }

  async symbolAlertToggle() {
    if (!!this.model.compositeMode) { // demo
      if (this.symbolAlert === false) {
        this.composites.forEach(c => c.alert = false);
      }
    }
    await this.inputStop();
  }

  async inputStop() {
    this.symbol.composites.find(comp => comp.code === this.symbol.code).alert = this.symbolAlert;
    if (this.missingDataMode()) {
      this.validate.emit();
    } else {
      //profile.page mode
      await this.database.saveSymbolValues(this.symbol);
    }
  }

}
