import { Component } from '@angular/core';
import { Pro } from '@ionic/pro';
import { Branch, ModelService } from 'src/app/services/model.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.page.html',
  styleUrls: ['./about.page.scss'],
})
export class AboutPage {

  //for update tool
  public deployChannel: string = "";
  public downloadProgress: number = 0;
  public updateAvailable: boolean = false;
  public lastCheck: string;
  public updating: boolean = false;

  public version: string = '';
  public updated: string = '';
  modelService = ModelService;
  Branch = Branch;

  constructor() {
    this.version = ModelService.version;
    this.updated = ModelService.updated;
    this.checkChannel();
  }

  async checkChannel() {
    let now = new Date();
    this.lastCheck = now.getHours() + ':' + now.getMinutes() + ':' + now.getSeconds();
    try {
      this.deployChannel = (await Pro.deploy.getConfiguration()).channel;
      this.updateAvailable = (await Pro.deploy.checkForUpdate()).available;
    } catch (err) {
      //alert('Deploy Error: ' + err);
    }
  }

  async performManualUpdate() {
    if (this.updating) return;
    try {
      this.downloadProgress = 1;
      const update = await Pro.deploy.checkForUpdate();

      if (update.available) {
        this.updating = true;

        await Pro.deploy.downloadUpdate((progress) => {
          this.downloadProgress = progress;
        });
        await Pro.deploy.extractUpdate();
        await Pro.deploy.reloadApp();
      } else {
        this.downloadProgress = 0;
      }
    } catch (err) {
      //alert('Update Error: ' + err);
    }
  }


}
