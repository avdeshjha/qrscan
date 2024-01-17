import { Component, OnInit } from '@angular/core';

import { FooterButton } from 'src/app/components/footer/footer.component';
import { SymbologyService } from 'src/app/services/symbology.service';
import { DatabaseService } from 'src/app/services/database.service';
import { SymbolType, Symbol } from 'src/app/services/model.service';
import { PageName } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {

  //internal
  private buttonsPrimary: boolean;

  //for template
  public buttons: FooterButton[];
  public page: PageName;

  public symbols: Symbol<SymbolType.User>[];

  constructor(
    public symbology: SymbologyService,
    public database: DatabaseService
  ) {
    this.buttons = [];
    this.page = PageName.PROFILE;
    this.toggleButtons();
  }

  async ngOnInit() {
    let s: Symbol<SymbolType.User>[] = this.symbology.getSymbols<SymbolType.User>(SymbolType.User);
    for (let i = 0; i < s.length; i++) {
      s[i] = await this.database.loadSymbolValues(s[i]);
      if (!!s[i].parts && s[i].parts.length > 0) {
        s[i].parts.forEach((p: any) => {
          p.missing = false;
          p.skip = false;
        });
      }
    }
    this.symbols = s;
  }

  toggleButtons() {
    if (!this.buttonsPrimary) {
      this.buttons = [];
      this.buttonsPrimary = true;
    } else {
      this.buttons = [
        {
          text: "barcode",
          icon: "barcode",
          callback: () => { console.log('barcode'); }
        }, {
          text: "apps",
          icon: "apps",
          callback: (this.toggleButtons).bind(this)
        },
      ];
      this.buttonsPrimary = false;
    }
  }

}
