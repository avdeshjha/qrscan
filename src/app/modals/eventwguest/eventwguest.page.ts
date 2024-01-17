import { Component, OnInit, ViewChild } from '@angular/core';
import { Platform, NavParams, ModalController, IonContent, PickerController } from '@ionic/angular';
import { ModelService, Fulfillment, FFAction } from 'src/app/services/model.service';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
    selector: "eventwguest",
    templateUrl: "./eventwguest.page.html",
    styleUrls: ["./eventwguest.page.scss"]
})
export class EventWGuestPage implements OnInit {
    @ViewChild(IonContent, { static: false }) content: IonContent;

    footerButtons: FooterButton[] = [];
    ff: Fulfillment;
    guests: number;

    constructor(
        public platform: Platform,
        public model: ModelService,
        private navParams: NavParams,
        private modalCtrl: ModalController,
        private ffService: FulfillmentService,
        private databaseService: DatabaseService,
        private pickerController: PickerController
    ) { }

    async ngOnInit() {
        this.ff = this.navParams.get('ff');
        this.guests = this.ff.getGuests();

        this.footerButtons = [
            {
                text: "Cancel",
                icon: "close",
                callback: (async () => { await this.closeModal() }).bind(this)
            }, {
                text: "Continue",
                icon: "chevron-forward",
                callback: (() => {
                    this.ff.setGuests(this.guests);
                    this.databaseService.saveFF(this.ff);
                    this.ff.ffAction = FFAction.UPDATE;
                    this.ffService.addFulfillment(this.ff);                    
                    this.modalCtrl.dismiss();
                })
            }];
    }

    async closeModal() {
        this.modalCtrl.dismiss();
    }

    async openGuestPicker() {
        let maxGuests = this.ff.getMaxGuests();
        let guestsArray = [];
        for (var i = 0; i <= maxGuests; i++) {
          guestsArray.push({ text: i.toString(), value: i });
        }
        let picker = await this.pickerController.create({
          columns: [
            {
              name: 'guests',
              options: guestsArray
            }
          ],
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel'
            },
            {
              text: 'Confirm',
              handler: (val) => {
                console.log(JSON.stringify(val));
                this.guests = val.guests.value;
              }
            }
          ]
        });
    
        await picker.present();
      }
}