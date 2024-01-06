import { Component, OnInit } from '@angular/core';
import { NavParams } from '@ionic/angular';
import { Fulfillment } from 'src/app/services/model.service';


@Component({
  selector: 'app-ff-popover',
  templateUrl: './ff-popover.component.html',
  styleUrls: ['./ff-popover.component.scss']
})
export class FFPopoverComponent implements OnInit {

  ff: Fulfillment;

  constructor(private navParams: NavParams) { }

  ionViewWillEnter() {
    this.ff = this.navParams.get('ff');
  }

  ngOnInit() {
  }

}
