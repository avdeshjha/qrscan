import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, MenuController, Platform, ToastController, AlertController } from '@ionic/angular';
// import { QRScanner, QRScannerStatus } from '@ionic-native/qr-scanner/ngx';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';
// import { Flashlight } from '@ionic-native/flashlight/ngx';
import { Subscription } from 'rxjs';
import * as CryptoJS from 'crypto-js';
import * as pako from 'pako';

import { PageName } from 'src/app/services/navigation.service';
import { ScanPage } from '../../modals/scan/scan.page';
import { ModelService } from 'src/app/services/model.service';
import { DatabaseService } from 'src/app/services/database.service';
import { SetupPage } from 'src/app/modals/setup/setup.page';
import { StandardQRPage } from 'src/app/modals/standardqr/standardqr.page';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-camera',
  templateUrl: './camera.page.html',
  styleUrls: ['./camera.page.scss'],
})
export class CameraPage implements OnInit, OnDestroy {

  //internal
  // scanSub: Subscription;

  //for template
  page: PageName;
  cameraAvailable: boolean;
  testQRData: string;

  scanState: string;

  constructor(
    private platform: Platform,
    private menu: MenuController,
    // private qrScanner: QRScanner,
    private social: SocialSharing,
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private vibration: Vibration,
    private model: ModelService,
    private db: DatabaseService,
    // private flashlight: Flashlight
    private alertController: AlertController
  ) {
    this.page = PageName.CAMERA
    this.cameraAvailable = true;

    // Non-punch cCode
    // this.testQRData = "http://ph4.bz//pcJE9LPCQrU9LvhY8YfmY6MT5LbnSO+HlQIWWfb9XbJxq0DjP8SUiJQFFZDH7txascvQT864k4KxztdCgl7bDjzLuWHHX6SbUwUPz/1ooVWqO/0QYoS1j1xpGbkJNkg";
    // Punch cCode
    // this.testQRData = "http://ph4.bz/thc0/q11JyRszQBOOeJ7ctCIDDKbWeXhytjUuaTX0NGt5pK7MhZfVnepJxrWnLwkRgg2tvMnXMA4bboeXC+Vvw==";
    // Punch pCode
    this.testQRData = "http://ph4.bz/7HHfbzzrtANGpxPOqdz3ElH/sPd51XZsGv04vJ1vpNaJADvhjTxW3k4hDKnga3oV+9CchpQIhgifX6N0lG8YZWkGlNk1j0hJa1lpbGPcHvZ/AeuejVCmr6tcthmcRaLuTeiiegB8Y49MltcFB7e6sw=="
  }

  async ngOnInit() {
    let ssE: boolean = await this.db.systemSettingsExist();

    if (!this.model.sfa && !ssE) {
      let setupModal = await this.modalCtrl.create({
        component: SetupPage,
        cssClass: 'setup-modal',
        componentProps: {
        }
      });

      await setupModal.present();
    }
    if (Capacitor.getPlatform() === 'web') {
      this.cameraAvailable = false;
    } else {
      await this.prepareCamera();
    }

    // if ((<any>window).cordova) {
    //   // running on device/emulator
    //   await this.prepareCamera();
    // } else {
    //   // running in browser
    //   this.cameraAvailable = false;
    // }
  }

  async ngOnDestroy() {
    // if ((<any>window).cordova && this.scanSub) {
    //   await this.scanSub.unsubscribe();
    // }
  }

  async clearDB() {
    if (confirm("Delete everything from the local database?")) {
      await this.db.clearData();
    }
  }

  ionViewWillEnter(){
    console.log("Entering camera view");
    if (Capacitor.getPlatform() !== 'web') {
      this.prepareCamera();
    }
  }

  ionViewWillLeave(){
    console.log("Leaving camera view");
    BarcodeScanner.stopScan();
  }

  async prepareCamera() {
    // Optionally request the permission early

    const status: boolean = await this.didUserGrantPermission(false);

    if (status) {
      // the user granted permission
      const result = await BarcodeScanner.startScan(); // start scanning and wait for a result

      // if the result has content
      if (result.hasContent) {
        console.log(result.content); // log the raw scanned content
        // if alert is showing, don't process scan
        let check = await this.alertController.getTop();
        if (check) {
          check.onDidDismiss().then(async ret => {
            await this.prepareCamera();
          });
          return;
        }
        await this.scan(result.content);
      }
    }

    // await this.qrScanner.prepare()
    //   .then(async (status: QRScannerStatus) => {
    //     if (status.authorized) {
    //       // camera permission was granted
    //       this.scanSub = this.qrScanner.scan().subscribe(async (qrData: string) => {
    //         // if alert is showing, don't process scan
    //         let check = await this.alertController.getTop();
    //         if (check) {
    //           check.onDidDismiss().then(async ret => {
    //             await this.prepareCamera();
    //           });
    //           return;
    //         }
    //         await this.scan(qrData);
    //       });
    //       await this.qrScanner.show();

    //     } else if (status.denied) {
    //       // camera permission was permanently denied
    //       // you must use QRScanner.openSettings() method to guide the user to the settings page
    //       // then they can grant the permission from there
    //       console.log('Camera permission denied');
    //       this.scanState = 'Permission denied';
    //     } else {
    //       // permission was denied, but not permanently. You can ask for permission again at a later time.
    //       console.log('Permission denied for this runtime.');
    //       this.scanState = 'Permission not granted';
    //     }
    //   })
    //   .catch(async (e: any) => {
    //     console.log('Error is', e);
    //     this.scanState = 'Error ' + JSON.stringify(e, null, 2);
    //   });
  }

  async scan(qrData: string) {
    if ((<any>window).cordova) {
      this.vibration.vibrate(1000);
    }
    let scanModal;
    if (qrData.startsWith("http://ph4.bz/")) {
      qrData = this.getOriginalCode(qrData);
      scanModal = await this.modalCtrl.create({
        component: ScanPage,
        cssClass: 'scan-modal',
        componentProps: {
          qrData: qrData,
          time: Date.now()
        }
      });
    } else {
      scanModal = await this.modalCtrl.create({
        component: StandardQRPage,
        componentProps: { qrData: qrData }
      });
    }

    scanModal.onDidDismiss().then(async ret => {
      await this.prepareCamera();
    });

    // if (this.scanSub) await this.scanSub.unsubscribe();

    await scanModal.present();
  }

  async openMenu() {
    this.menu.open("mainMenu");
  }

  async share() {
    if ((<any>window).cordova) {
      await this.social.shareViaTwitter("test");
    }
    let toast = await this.toastController.create({
      message: "Sharing not yet available",
      duration: 1000
    });
    toast.present();
  }

  async toggleFlashlight(off?: any) {
    //   let avail = await this.flashlight.available();
    //   alert(avail);
    //   await this.flashlight.toggle().then(f => alert(f), r => alert(r)).catch(e => alert(e));
    //   alert('try toggle');
    //   if ((<any>window).cordova) {
    //     if (off) {
    //       await this.flashlight.switchOff();
    //       return;
    //     }
    //     await this.flashlight.toggle();
    //   }
  }

  getOriginalCode(qrData: string): string {
    qrData = qrData.replace("http://ph4.bz/", "");
    qrData = this.decrypt(qrData);
    qrData = this.inflate(qrData);
    console.log("Processed source qrData as: " + qrData);

    return qrData;
  }

  decrypt(base64Data: string): string {
    let base64Key = "aDk2YYOWmRV5T1KeSs+tNg==";

    let decryptedWords = CryptoJS.AES.decrypt(
      base64Data,
      CryptoJS.enc.Base64.parse(base64Key),
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    let deflated = CryptoJS.enc.Base64.stringify(decryptedWords);
    return deflated;
  }

  inflate(base64deflated: string): string {
    let strData = atob(base64deflated);
    var charData = strData.split('').map(function (x) { return x.charCodeAt(0); });
    var binData = new Uint8Array(charData);
    let inflated = pako.inflate(binData, { to: 'string' });

    return inflated;
  }

  async didUserGrantPermission(showAlert: boolean) {
    // check if user already granted permission
    const status = await BarcodeScanner.checkPermission({ force: false });
    if (showAlert) {
      alert("Current status: " + JSON.stringify(status));
    }

    if (status.granted) {
      // user granted permission
      return true;
    }

    if (status.denied) {
      // user denied permission
      // the user denied permission for good
      // redirect user to app settings if they want to grant it anyway
      const c = confirm(
        'If you want to grant permission for using your camera, enable it in the app settings and restart the application. Open app settings?',
      );
      if (c) {
        BarcodeScanner.openAppSettings();
      }
      return false;
    }

    if (status.asked) {
      // system requested the user for permission during this call
      // only possible when force set to true
    }

    if (status.neverAsked) {
      // user has not been requested this permission before
      // it is advised to show the user some sort of prompt
      // this way you will not waste your only chance to ask for the permission
      const c = confirm(
        'We need your permission to use your camera to be able to scan barcodes',
      );
      if (!c) {
        return false;
      }
    }

    if (status.restricted || status.unknown) {
      // ios only
      // probably means the permission has been denied
      return false;
    }

    // user has not denied permission
    // but the user also has not yet granted the permission
    // so request it
    const statusRequest = await BarcodeScanner.checkPermission({ force: true });
    if (showAlert) {
      alert("status request result: " + JSON.stringify(statusRequest));
    }

    if (statusRequest.asked) {
      // system requested the user for permission during this call
      // only possible when force set to true
    }

    if (statusRequest.granted) {
      // the user did grant the permission now
      return true;
    }

    // user did not grant the permission, so he must have declined the request
    return false;
  };

  test1() {
    this.didUserGrantPermission(true);
  }

  test2() {
    this.prepareCamera();
  }

  test3() {
    BarcodeScanner.stopScan();
  }


  async staticData() {
    const alert = await this.alertController.create({
      header: "Enter QR Data",
      inputs: [
        {
          name: "input1",
          type: "text",
          placeholder: "QR Data",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
          cssClass: "secondary",
          handler: () => {
            console.log("Confirm Cancel");
          },
        },
        {
          text: "Submit",
          handler: async (alertData) => {
            // console.log(alertData.input1);
            await this.qrData(alertData.input1);
          },
        },
      ],
    });
    await alert.present();
  }

  async qrData(qrData: string) {
    if (qrData.startsWith("http://ph4.bz/")) {
      this.scan(qrData)
    } else {
      let scanModal = await this.modalCtrl.create({
        component: ScanPage,
        cssClass: "scan-modal",
        componentProps: {
          qrData: qrData,
          time: Date.now(),
        },
      });

      scanModal.onDidDismiss().then(async (ret) => {
        await this.prepareCamera();
      });
      await scanModal.present();
    }
  }
}
