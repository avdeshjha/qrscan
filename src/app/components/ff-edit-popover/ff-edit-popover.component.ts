import { Component, OnInit } from '@angular/core';
import { NavParams, PopoverController } from '@ionic/angular';
import { Fulfillment, InputSymbol, SymbolType, FFAction, FFData, Symbol } from 'src/app/services/model.service';
import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { SymbologyService } from 'src/app/services/symbology.service';


@Component({
  selector: 'app-ff-edit-popover',
  templateUrl: './ff-edit-popover.component.html',
  styleUrls: ['./ff-edit-popover.component.scss'],
})
export class FfEditPopoverComponent implements OnInit {

  //template control
  updated: boolean = false

  //data
  ff: Fulfillment;
  inputSymbols: InputSymbol<SymbolType.User>[];
  actionSymbol: Symbol<any>;

  constructor(
    public navParams: NavParams,
    public ffService: FulfillmentService,
    public symbology: SymbologyService,
    public pop: PopoverController,
  ) {
  }

  ngOnInit() {
    this.ff = this.navParams.get('ff');
    // console.log('ff-edit-popover.ff.ffData:');
    // console.table(this.ff.ffData)

    this.inputSymbols = this.ffService.makeInputSymbols<SymbolType.User>(SymbolType.User, this.ff.ffData, true);
    let data: FFData = this.ff.ffData.find(d => d.type === SymbolType.Action);
    this.actionSymbol =  this.symbology.getSymbol<SymbolType.Action>(SymbolType.Action, data.code)
    
  }

  validate() {
    //todo
  }

  cancel() {
    this.pop.dismiss();
  }

  update() {
    if (this.updated) return;
    this.updated = true;
    this.inputSymbols.forEach(symbol => {
      let ffData: FFData = this.ff.ffData.find(data => data.code === symbol.code && data.type === symbol.type);
      symbol.parts
        .filter(part => !!part.value)
        .forEach(part => {
          let dPart = ffData.parts.find(dPart => dPart.code === part.code);
          if (!!dPart) {
            dPart.value = part.value;
          }
        });
    });
    this.ff.ffAction = FFAction.UPDATE;
    this.ffService.addFulfillment(this.ff);
  }

}
