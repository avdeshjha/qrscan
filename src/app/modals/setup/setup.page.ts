import { Component, OnInit } from '@angular/core';
import { NavigationService, PageName } from 'src/app/services/navigation.service';
import { DatabaseService } from 'src/app/services/database.service';
import { SystemSettings } from 'src/app/services/model.service';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.page.html',
  styleUrls: ['./setup.page.scss'],
})
export class SetupPage implements OnInit {

  settings: SystemSettings;

  constructor(
    private modalCtrl: ModalController,
    private database: DatabaseService,
    private nav: NavigationService
  ) { }

  async ngOnInit() {
    this.settings = await this.database.loadSystemSettings();
  }

  async saveSettings() {
    await this.database.saveSystemSettings(this.settings);
  }

  async leaveSetup() {
    try {
      await this.modalCtrl.dismiss();
    } catch (e) {
      this.nav.openPage(PageName.CAMERA);
    }
  }

  settingsReady(): boolean {
    return !!this.settings && (this.settings.timeout > 1) && !!this.settings.readerID
  }

}
