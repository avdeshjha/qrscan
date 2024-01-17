import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
// import { Keyboard } from '@ionic-native/keyboard/ngx';

import { NavigationService, PageName } from 'src/app/services/navigation.service';
import { PopoverController } from '@ionic/angular';

import { FFPopoverComponent } from '../ff-popover/ff-popover.component';
import { Fulfillment } from 'src/app/services/model.service';
import { Keyboard } from '@ionic-native/keyboard/ngx';

export interface FooterButton {
  icon?: string,
  text: string,
  selected?: boolean,
  callback?: () => void,
  ffPopover?: Fulfillment,
  highlight?: boolean,
  highlightBackground?: boolean
}

@Component({
  selector: 'footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {

  static showAd: boolean = false;

  // input
  private _buttons: FooterButton[];
  private _page: PageName;
  private highlightBackground = false;

  // private
  private nav: FooterButton[];
  private useNav: boolean;

  @Input()
  set buttons(buttons: FooterButton[]) {
    if (buttons !== null && buttons.length == 0) {
      this.useNav = true;
      this._buttons = this.nav;
      return;
    }
    this._buttons = buttons;

    if (buttons.find(b => b.highlightBackground)) this.highlightBackground = true;
  }
  get buttons(): FooterButton[] { return this._buttons; }

  @Input()
  set page(page: PageName) {
    this._page = page;
    this.nav = this.getNav(page);
    if (this.useNav) this._buttons = this.nav;
  }
  get page(): PageName { return this._page; }

  constructor(
    private navigation: NavigationService,
    private router: Router,
    public popoverController: PopoverController,
    public kb: Keyboard
  ) { }

  getNav(page?: PageName): FooterButton[] {
    return [
      {
        text: "cScan",
        icon: "camera",
        selected: page === PageName.CAMERA,
        callback: (() => this.router.navigateByUrl('/')).bind(this)
      }, {
        text: "Wallet",
        icon: "pricetags",
        selected: page === PageName.PROMOS,
        callback: (() => this.navigation.openPage(PageName.PROMOS)).bind(this)
      }, {
        text: "No Service",
        icon: "file-tray",
        selected: page === PageName.PENDING,
        callback: (() => this.navigation.openPage(PageName.PENDING)).bind(this)
      }, {
        text: "History",
        icon: "newspaper",
        selected: page === PageName.HISTORY,
        callback: (() => this.navigation.openPage(PageName.HISTORY)).bind(this)
      }
    ];
  }

  async buttonClick(event: any, button: FooterButton) {
    try {
      if (button.ffPopover) {
        await this.popover(event, button);
      } else if (button.callback) {
        await button.callback();
      }
    } catch (err) {
      alert(err);
      console.error(err);
    }
  }

  async popover(event: any, button: FooterButton) {
    // todo if reimplementing, include promo in componentprops
    const popover = await this.popoverController.create({
      component: FFPopoverComponent,
      event: event,
      translucent: true,
      cssClass: "ff-popover",
      componentProps: {
        ff: button.ffPopover,

      }
    });
    return await popover.present();
  }

  //hide/show ad
  hideAd() {
    FooterComponent.showAd = false;
  }

  isShowAd(): boolean {
    return FooterComponent.showAd;
  }

  isShowFoot(): boolean {
    return !((<any>window).cordova && this.kb.isVisible);
  }
}
