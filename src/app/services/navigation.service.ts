import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { ModalOptions } from '@ionic/core';
import { ModalController } from '@ionic/angular';

export enum PageName {
  HELP,
  SETUP,
  USERS,
  ADMIN,
  ABOUT,
  PROMOS,
  SYSTEM,
  CAMERA,
  PROFILE,
  PENDING,
  HISTORY,
  APPROVAL,
}

@Injectable({
  providedIn: 'root'
})
export class NavigationService {

  constructor(
    private modalCtrl: ModalController,
    private router: Router,
  ) { }

  async openPage(name: PageName) {
    let modalTarget: any;
    let pageTarget: string;

    switch (name) {
      case PageName.PROFILE:
        pageTarget = 'profile';
        break;
      case PageName.APPROVAL:
        pageTarget = 'approval';
        break;
      case PageName.PROMOS:
        pageTarget = 'promos';
        break;
      case PageName.HISTORY:
        pageTarget = 'history';
        break;
      case PageName.PENDING:
        pageTarget = 'pending';
        break;
      case PageName.SYSTEM:
        pageTarget = 'system';
        break;
      case PageName.HELP:
        pageTarget = 'help';
        break;
      case PageName.ABOUT:
        pageTarget = '/about';
        break;
      case PageName.SETUP:
        pageTarget = '/setup';
        break;
      case PageName.CAMERA:
        pageTarget = '/';
        break;
    }

    if (modalTarget) {
      const modalOptions: ModalOptions = {
        component: modalTarget,
        componentProps: {
          cssClass: "modalPage",
        }
      }
      const modal = await this.modalCtrl.create(modalOptions);
      await modal.present();

    } else if (pageTarget) {
      this.router.navigateByUrl(pageTarget);
    }

  }


}
