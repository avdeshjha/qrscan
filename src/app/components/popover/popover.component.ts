import { Component, OnInit } from '@angular/core';
import { PopoverController, NavParams } from '@ionic/angular';

@Component({
    selector: 'app-settings',
    templateUrl: './popover.component.html',
    styleUrls: ['./popover.component.scss']
})
export class PopoverComponent implements OnInit {
    fields: [String, boolean][];

    constructor(
        private popoverController: PopoverController,
        private navParams: NavParams
    ) {

    }

    ngOnInit() {
        //Get data from popover page
        this.fields = this.navParams.get('fields');
    }

    eventFromPopover(arg: String) {
        this.popoverController.dismiss(arg);
    }
}