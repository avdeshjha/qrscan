import { Component } from '@angular/core';
import { Calendar } from '@ionic-native/calendar/ngx';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-cal-select-popover',
  templateUrl: './cal-select-popover.component.html',
  styleUrls: ['./cal-select-popover.component.scss'],
})
export class CalSelectPopoverComponent {

  calNames: string[];
  debug: string;

  constructor(
    public calendar: Calendar,
    public pop: PopoverController,
  ) { }

  async ionViewWillEnter() {
    if (!(<any>window).cordova) {
      this.calNames = ['virtual cal 1', 'virtual cal 2', 'virtual cal 3', 'virtual cal 4'];
      return;
    }
    let cals: any[] = await this.calendar.listCalendars();
    this.calNames = cals.map(c => c.name);
    
    this.debug = JSON.stringify(cals, null, 2);

  }

  async returnName(name: string) {
    await this.pop.dismiss(name);
  }

}
