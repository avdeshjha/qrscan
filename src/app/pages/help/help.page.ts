import { Component } from '@angular/core';

import { format, parse } from 'date-fns';


@Component({
  selector: 'app-help',
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
})
export class HelpPage {

  testDate: string;
  
  constructor() { }

  printDate() {
    
    console.table(this.testDate);
    
    let date: Date = parse(this.testDate);
    

    let m: string = format(date, 'MM');
    let d: string = format(date, 'DD');
    let y: string = format(date, 'YYYY');

    console.log(m);
    console.log(d);
    console.log(y);
  }

}
