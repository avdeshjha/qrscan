import { Component, OnInit } from '@angular/core';

import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { DatabaseService } from 'src/app/services/database.service';
import { PageName } from 'src/app/services/navigation.service';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { FFAction, FFState, Fulfillment, TaskStatus } from 'src/app/services/model.service';
import { AlertController } from '@ionic/angular';
import { DateTime } from 'luxon';

export interface ListItem extends Fulfillment {
  selected?: boolean,
}

@Component({
  selector: 'app-pending',
  templateUrl: './pending.page.html',
  styleUrls: ['./pending.page.scss'],
})
export class PendingPage implements OnInit {

  //for template
  fulfillments: ListItem[];
  page: PageName = PageName.PENDING;
  buttons: FooterButton[] = [];
  editContext: boolean = false;

  constructor(
    public fulfillment: FulfillmentService,
    public database: DatabaseService,
    public alert: AlertController,
    public ffService: FulfillmentService,
  ) { }

  async ngOnInit() {
    await this.loadFFs();
  }

  async loadFFs() {
    /*todo
    let fObjs: any[] = await this.database.getByDomain<Fulfillment>(Domain.FULFILLMENT);

    let ffs: ListItem[] = [];
    for (let obj of fObjs) {
      let ffItem: ListItem = this.fulfillment.objToFulfillment(obj);
      if (ffItem.tasks.some(t => t.status !== TaskStatus.COMPLETE)) {
        ffs.push(ffItem);
      }
    }

    this.fulfillments = ffs; //use ffs[] so list page elements load together
    */

    let ffs: Fulfillment[] = await this.database.loadFFs();
    // delete any canceled campaigns that have expired
    ffs.filter(ff => ff.isCanceled()).forEach(ff => {
      const interval = ff.getCampaignInterval();
      const endDate: DateTime = interval.end ? interval.end : null;
      
      if (DateTime.local() > endDate) {
        this.database.deleteFFandChildren(ff);
      }
    })
    this.fulfillments = ffs.filter(ff => {
      // !ff.tasks.every(t => t.status !== TaskStatus.COMPLETE);
      return ff.state == FFState.PENDING && !ff.isCanceled();
    });
  }

  getEditCallbacks(): [() => void, () => void] {
    return [
      this.startEdit.bind(this),
      this.stopEdit.bind(this)
    ];
  }

  startEdit(): void {
    this.buttons = [{
      text: "Done",
      callback: this.stopEdit.bind(this)
    }, {
      text: "All",
      callback: this.selectAll.bind(this)
    }, {
      text: "None",
      callback: this.selectNone.bind(this)
    }, {
      text: "Delete",
      callback: this.delete.bind(this)
    }];
    this.editContext = true;
  }

  stopEdit(): void {
    this.buttons = [];
    this.editContext = false;
    this.selectNone();
  }

  selectAll(): void {
    this.fulfillments.forEach(p => p.selected = true);
  }

  selectNone(): void {
    this.fulfillments.forEach(p => p.selected = false);
  }

  async delete(): Promise<void> {
    let selected: ListItem[] = this.fulfillments.filter(p => p.selected);
    if (selected.length === 0) {
      this.stopEdit();
      return;
    }

    const alert = await this.alert.create({
      header: 'Delete ' + selected.length + ' Pending QRA' + (selected.length === 1 ? '?' : 's?'),
      message: 'Warning! You will be unable to edit deleted QRAs',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
          }
        }, {
          text: 'Delete',
          handler: (async () => {
            for (let i = 0; i < selected.length; i++) {
              let ff: Fulfillment = await this.database.loadFF(selected[i].databaseID);
              const interval = ff.getCampaignInterval();
              const endDate: DateTime = interval.end ? interval.end : null;
              
              if (DateTime.local() > endDate) {
                // if expired, delete
                await this.database.deleteFFandChildren(ff);
              } else {
                // if not expired, cancel
                await this.database.setFFandChildrenCanceledState(ff, true);
                ff.ffAction = FFAction.CANCEL;
                this.ffService.addFulfillment(ff);
              }
            }
            await this.loadFFs();
            this.stopEdit();
          }).bind(this)
        }
      ]
    });

    await alert.present();
  }

}
