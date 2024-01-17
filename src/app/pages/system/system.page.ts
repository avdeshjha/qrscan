import { Component, OnInit } from '@angular/core';
import { DatabaseService } from 'src/app/services/database.service';
import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { Branch, Fulfillment, ModelService, SystemSettings } from 'src/app/services/model.service';
// import { FirebaseX } from '@ionic-native/firebase-x/ngx';
import { AlertController, ToastController } from '@ionic/angular';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { FcmService } from 'src/app/services/fcm.service';

@Component({
  selector: 'app-system',
  templateUrl: './system.page.html',
  styleUrls: ['./system.page.scss'],
})
export class SystemPage implements OnInit {

  dbObjs: any[];
  ffs: Fulfillment[];

  settings: SystemSettings;
  // enum access for html
  Branch = Branch;
  modelService = ModelService

  constructor(
    public database: DatabaseService,
    public fulfillment: FulfillmentService,
    public model: ModelService,
    // private firebase: FirebaseX,
    private alert: AlertController,
    private clipboard: Clipboard,
    private toast: ToastController,
    private fcmService: FcmService
  ) {
    this.dbObjs = [];
    this.ffs = [];
  }

  async ngOnInit() {
    this.settings = await this.database.loadSystemSettings();
  }

  async saveSettings() {
    await this.database.saveSystemSettings(this.settings);
  }

  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async clearDB() {
    if (confirm("Delete everything from the local database?")) {
      await this.database.clearData();
    }
  }

  async loadDB() {
    let dbText = prompt("JSON text:");
    if (!dbText || dbText.length < 1) return;
    await this.database.loadDB(dbText);
  }

  async dumpDB() {
    let d = await this.database.dumpDB();
    prompt('Database:', d);
  }

  async printDatabase() {
    //this.dbObjs = await this.database.getByDomain<any>(Domain.FULFILLMENT);
    //this.ffs = this.dbObjs.map(o => this.fulfillment.objToFulfillment(o));
    this.dbObjs = await this.database.printDB();
    console.table(this.dbObjs);

    this.dbObjs.forEach(o => {
      console.table(o);
      console.table(o._payload);
    });
  }

  async getToken() {
    // this.firebase.getToken().then(token => {
    // (<any>window).FirebasePlugin.getToken().then(token => {
    //   console.log(`The token is ${token}`);
    // (<any>window).FirebasePlugin.getToken((token => {
    //   console.log(`The token is ${token}`)
    //   this.alert.create({
    //     header: 'Device token',
    //     message: token,
    //     buttons: [{
    //       text: 'Copy',
    //       handler: (async () => {
    //         await this.clipboard.copy(token);
    //         let toast = await this.toast.create({
    //           message: "Text copied",
    //           duration: 700
    //         });
    //         toast.present();
    //       }).bind(this)
    //     },
    //     {
    //       text: 'Okay',
    //       handler: (async () => { }).bind(this)
    //     }]
    //   }).then(alert => alert.present());
    // }));
    let token: string = this.model.fcmToken;
    console.log("Token is " + token);
    this.alert.create({
      header: 'Device token',
      message: token,
      buttons: [{
        text: 'Copy',
        handler: (async () => {
          await this.clipboard.copy(token);
          let toast = await this.toast.create({
            message: "Text copied",
            duration: 700
          });
          toast.present();
        }).bind(this)
      },
      {
        text: 'Okay',
        handler: (async () => { }).bind(this)
      }]
    }).then(alert => alert.present());
  }

  stringOf(o: any): string {
    return JSON.stringify(o, null, 2);
  }

  getHelpContent(): string {
    return "On this page you can set some system wide settings. Right now it's being used for devlopment only";
  }



}
