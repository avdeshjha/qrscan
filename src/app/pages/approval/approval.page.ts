import { Component, OnInit } from '@angular/core';

import { SymbologyService } from 'src/app/services/symbology.service';
import { DatabaseService } from 'src/app/services/database.service';
import { ToastController } from '@ionic/angular';
import { Symbol, SymbolType } from 'src/app/services/model.service';

@Component({
  selector: 'app-approval',
  templateUrl: './approval.page.html',
  styleUrls: ['./approval.page.scss'],
})
export class ApprovalPage implements OnInit {

  //internal
  alertable: string[] = ['D', 'Q', 'J', 'S'];

  //for template
  symbols: Symbol<SymbolType.Action>[];

  constructor(
    private database: DatabaseService,
    private symbology: SymbologyService,
    private toastController: ToastController
  ) {
    this.symbols = [];
  }

  async ngOnInit() {
    this.symbols = [];
    this.alertable.forEach(async code => {
      this.symbols.push(await this.database.loadSymbolValues(
        this.symbology.getSymbol<SymbolType.Action>(SymbolType.Action, code)
      ));
    });

    console.log('approval symbols');
    console.table(this.symbols);
  }

  async presentToast(message: string) {
    let toast = await this.toastController.create({
      message: message,
      duration: 1000,
      position: 'top',
    });
    toast.present();
  }

}
