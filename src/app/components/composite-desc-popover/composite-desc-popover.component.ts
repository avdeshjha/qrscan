import { Component, OnInit } from '@angular/core';
import { NavParams } from '@ionic/angular';
import { Composite, Symbol } from 'src/app/services/model.service';

@Component({
  selector: 'app-composite-desc-popover',
  templateUrl: './composite-desc-popover.component.html',
  styleUrls: ['./composite-desc-popover.component.scss'],
})
export class CompositeDescPopoverComponent implements OnInit {

  symbol: Symbol<any>;
  composite: Composite;

  partsNames: string[];

  constructor(private navParams: NavParams) { }

  ionViewWillEnter() {
    this.symbol = this.navParams.get('symbol');
    this.composite = this.navParams.get('comp');

    this.partsNames = this.composite.partCodes
      .map(code => this.symbol.parts.find(part => part.code === code).text);

  }

  comprisedText(): string {
    if (!!this.composite && this.composite.code === '3') return 'calculated from';

    return 'comprised of';
  }

  ngOnInit() { }

}
