import { Component } from '@angular/core';
import { MenuController, ToastController } from '@ionic/angular';

import { StatusBar } from '@ionic-native/status-bar/ngx';
// import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { NavigationService, PageName } from './services/navigation.service';
// import { FirebaseX } from "@ionic-native/firebase-x/ngx";
import { FFState, Fulfillment, Promo, RedeemStatus, ModelService } from './services/model.service';
import { DatabaseService } from './services/database.service';
// import { ILocalNotification, ILocalNotificationActionType, LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { FcmService } from './services/fcm.service';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

var inBackground = false;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {

  constructor(
    // private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private menu: MenuController,
    private navigation: NavigationService,
    private toast: ToastController,
    private model: ModelService,
    public database: DatabaseService,
    private fcmService: FcmService
  ) {
    this.initializeApp();
  }

  get PageName() { return PageName }

  initializeApp() {
    console.log("Platform ready");

    this.statusBar.styleBlackOpaque();

    let target: any = PageName.CAMERA;

    document.addEventListener("resume", function () { inBackground = false; }, false);
    document.addEventListener("pause", function () { inBackground = true; }, false);

    if (Capacitor.getPlatform() != 'web') {
      console.log("Initializing push...");
      this.fcmService.initPush();
    } else {
      console.log("Not on mobile platform. Won't init push");
    }

    // this.splashScreen.hide();
    SplashScreen.hide();
    this.navigation.openPage(target);
  }

  async closeMenu() {
    await this.menu.close('mainMenu');
  }

  async openPage(name: PageName) {
    await this.closeMenu();
    this.navigation.openPage(name);
  }

  async presentToast(message: string) {
    let toast = await this.toast.create({
      message: message,
      duration: 1000
    });
    toast.present();
  }
  async test1() {
    this.fcmService.scheduleBasic();
  }

  async test2() {
    console.log("Pressed");
    let input: string = prompt("State");
    console.log("Input: " + input);

    let state: FFState = FFState[input];
    console.log(JSON.stringify(state));
    if (state != null) {
      let ffs: Fulfillment[] = await this.database.loadFFs();
      ffs.forEach(ff => {
        ff.state = state;
        this.database.saveFF(ff);
      })
    }
  }

  async test3() {
    console.log("Pressed2");
    let input: string = prompt("State");
    console.log("Input2: " + input);

    let state: RedeemStatus = RedeemStatus[input];
    console.log(JSON.stringify(state));
    if (state != null) {
      let promos: Promo[] = await this.database.loadPromos();
      promos.forEach(promo => {
        promo.redeemStatus = state;
        this.database.savePromo(promo);
      })
    }
  }
}
