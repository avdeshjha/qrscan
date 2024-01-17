import { Component } from '@angular/core';
import { DatabaseService } from 'src/app/services/database.service';
import { PageName } from 'src/app/services/navigation.service';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { EngageType, FFAction, Fulfillment, Promo, PromoType } from 'src/app/services/model.service';
import { AlertController, ModalController } from '@ionic/angular';
import { PromoDetailsPage } from 'src/app/modals/promo-details/promo-details.page';
import { DateTime } from 'luxon';
import { FulfillmentService } from 'src/app/services/fulfillment.service';

export interface ListItem {
  selected?: boolean,
  promo: Promo
}

@Component({
  selector: 'app-promo',
  templateUrl: 'promo.page.html',
  styleUrls: ['promo.page.scss']
})
export class PromoPage {

  //for template
  page: PageName;
  promosList: ListItem[];
  buttons: FooterButton[];
  editContext: boolean;
  PromoType = PromoType;
  EngageType = EngageType;

  constructor(
    private database: DatabaseService,
    public alert: AlertController,
    public modalCtrl: ModalController,
    public ffService: FulfillmentService,
  ) {
    this.promosList = [];
    this.page = PageName.PROMOS;
    this.buttons = [];
    this.editContext = false;
  }

  async ionViewWillEnter() {
    await this.regenPromoList();
  }

  async details(promo : Promo) {
    let scanModal = await this.modalCtrl.create({
      component: PromoDetailsPage,
      cssClass: 'promo-details-modal',
      componentProps: {
        promo: promo
      }
    });

    scanModal.onDidDismiss().then(() => this.regenPromoList());

    await scanModal.present();
  }

  async regenPromoList() {
    this.promosList = [];
    let promos: Promo[] = await this.database.loadPromos();

    promos.forEach(async p => {
    });
    promos.sort(function(a, b) {
      return a.addedTime - b.addedTime;
    }).filter(promo => !promo.isCanceled()).forEach(async promo => {
      await this.database.updatePromoStatus(promo, true);
        this.promosList.push({
          selected: false,
          promo: promo
        });
    });

    // await this.database.loadPromos().then(promos => {
    //   promos.sort(function(a, b) {
    //     return a.addedTime - b.addedTime;
    //   });
    //   promos.forEach(p => {
    //     this.database.updatePromoStatus(p, true);
    //     this.promosList.push({
    //       selected: false,
    //       promo: p
    //     });
    //   });
    //   console.log('found: ' + promos.length + ' promos');
    // });
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
    this.promosList.forEach(p => p.selected = true);
  }

  selectNone(): void {
    this.promosList.forEach(p => p.selected = false);
  }

  async delete(): Promise<void> {
    let selected: ListItem[] = this.promosList.filter(p => p.selected);
    if (selected.length === 0) {
      this.stopEdit();
      return;
    }

    const alert = await this.alert.create({
      header: 'Delete ' + selected.length + ' Promo QRA' + (selected.length === 1 ? '?' : 's?'),
      message: 'Warning! Deleting wallet item will delete associated campaign items. Continue?',
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
              let promo: Promo = await this.database.loadPromo(selected[i].promo.databaseID);
              let ff: Fulfillment = promo.getParentCampaign();
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
              // this.database.delete(selected[i].promo.databaseID);
              await this.regenPromoList();
            }
            this.stopEdit();
          }).bind(this)
        }
      ]
    });

    await alert.present();
  }

}