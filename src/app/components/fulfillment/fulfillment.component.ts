import { Component, Input, Output, EventEmitter } from '@angular/core';

import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { TaskStatus, Fulfillment, FFState, Interval, FFData, SymbolType, Symbol, Promo, EngageType, BonusType } from 'src/app/services/model.service';
import { SymbologyService } from 'src/app/services/symbology.service';
import { PopoverController, ModalController } from '@ionic/angular';
import { FfEditPopoverComponent } from '../ff-edit-popover/ff-edit-popover.component';

import { DateTime } from 'luxon';
import { FfDetailsPage } from 'src/app/modals/ff-details/ff-details.page';
import { DatabaseService } from 'src/app/services/database.service';
import { PromoDetailsPage } from 'src/app/modals/promo-details/promo-details.page';
// import { TranslateConfigService } from 'src/app/services/translate-config.service';
// import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'fulfillment',
  templateUrl: './fulfillment.component.html',
  styleUrls: ['./fulfillment.component.scss']
})
export class FulfillmentComponent {

  //internal
  ff: Fulfillment;

  //for template
  action: string;
  org: string;
  description: string;
  procTimeStr: string;

  start: string;
  end: string;
  scanned: string;
  active: boolean = true;

  isPromo: boolean;
  isDrawing: boolean;
  isPunch: boolean;

  surveyOption: string;

  tasksFailed: boolean = false;

  engageType: EngageType;
  currentState: String;
  EngageType = EngageType;
  hasChild: boolean = true;

  enagaementType: string

  @Input()
  set fulfillment(ff: Fulfillment) {
    this.ff = ff;
    this.parseFulfillment(ff);
  };

  @Output()
  onDismissed: EventEmitter<any> = new EventEmitter<any>();

  get fulfillment(): Fulfillment {
    return this.ff;
  }
  // language: any; // MultiLanguage

  constructor(
    public symbology: SymbologyService,
    public ffService: FulfillmentService,
    public popover: PopoverController,
    public modalCtrl: ModalController,
    private database: DatabaseService,
    // private translateConfigService: TranslateConfigService, //MultiLanguage
  ) {
    // this.translateConfigService.getDefaultLanguage();
    // this.language = this.translateConfigService.getCurrentLang(); // MultiLanguage
   }

  public parseFulfillment(fulfillment: Fulfillment) {

    const campInterval: Interval = fulfillment.getCampaignInterval();
    if (!!campInterval.end) {
      if (campInterval.end.diffNow() < 0) {
        this.active = false;
      }
    }
    // const eventInterval: Interval = fulfillment.getEventInterval();

    let surveyOption: string;
    //surveyOption = fulfillment.payload.get('surveyOption');

    let procTimeMs = fulfillment.processedTime;
    
    // When we use AQUA ,AEUA like code not show bonus and coupon icon if child not registered
    if(fulfillment.getEngageType() != EngageType.PUNCH && fulfillment.getEngageType() != EngageType.PROMOTION && fulfillment.isPunch() && fulfillment.getPunchID() == undefined){
      this.hasChild = false;
    }else{
      this.hasChild = true;
    }

    let actionData: FFData = this.ff.ffData.find(d => d.type === SymbolType.Action);
    let actionSymbol: Symbol<SymbolType.Action> = this.symbology.getSymbol<SymbolType.Action>(SymbolType.Action, actionData.code);
    if (procTimeMs !== undefined) {
      this.procTimeStr = this.ffService.dateToHumanReadable(DateTime.fromMillis(procTimeMs));
    }
    this.action = actionSymbol.text;
    this.org = fulfillment.getOrg();
    this.description = fulfillment.getDescription();
    // this.start = this.ffService.dateToHumanReadable(eventInterval.start);
    // this.end = this.ffService.dateToHumanReadable(eventInterval.end);
    this.scanned = this.ffService.dateToHumanReadable(DateTime.fromISO(fulfillment.scanTime));
    this.surveyOption = surveyOption;
    if (!!fulfillment.tasks) {
      this.tasksFailed = fulfillment.tasks.some(t => t.status === TaskStatus.FAILED)
    }

    this.isPromo = fulfillment.isPromo();
    this.isDrawing = fulfillment.isDrawing();
    this.isPunch = fulfillment.isPunch();

    this.engageType = this.fulfillment.getEngageType();
    if(!this.fulfillment.isDummy) this.currentState = this.fulfillment.getUserFacingState();
    else this.currentState = 'Missing'
    // this.currentState = this.fulfillment.getUserFacingState();
    this.enagaementType = this.getActionText(fulfillment);
    this.getEngmentDate(fulfillment)

  }

  getEngmentDate(fulfillment:Fulfillment) {
    let dateTime: Interval;
    let startDate: string;
    let endDate: string; 
    try{
      // console.log("Engagment Type",fulfillment.getEngageType());
      if (fulfillment.getEngageType() === EngageType.PROMOTION) {
        dateTime = fulfillment.getPromoIntervalNew();
      } else if (fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST) {
        dateTime = fulfillment.getEventInterval();
      } else if (fulfillment.getEngageType() === EngageType.EVENT_REGISTRATION) {
        dateTime = fulfillment.getEventInterval();
      } else if (fulfillment.getEngageType() === EngageType.SURVEY) {
        dateTime = fulfillment.getCampaignInterval();
      } else if (fulfillment.getEngageType() === EngageType.FIVESTARSURVEY) {
        dateTime = fulfillment.getCampaignInterval();
      } else if (fulfillment.getEngageType() === EngageType.PUNCH) {
        dateTime = fulfillment.getPromoIntervalNew();
      } else{
        dateTime = fulfillment.getCampaignInterval();
      }
      startDate = dateTime.start.toISO();
      endDate = dateTime.end.toISO();
    } catch(e) {
      dateTime = fulfillment.getCampaignInterval()
      startDate = dateTime.start.toISO();
      endDate = dateTime.end.toISO();
    }
    this.start = DateTime.fromISO(startDate).toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    this.end = DateTime.fromISO(endDate).toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  getActionText (fulfillment: Fulfillment): string {
    if (fulfillment.getEngageType() === EngageType.PROMOTION) {
      return 'eCoupon';
    } else if (fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST){
      return this.action;
    } else if (fulfillment.getEngageType() === EngageType.EVENT_REGISTRATION){
      return this.action;
    } else if (fulfillment.getEngageType() === EngageType.SURVEY){
      return this.action;
    } else if (fulfillment.getEngageType() === EngageType.FIVESTARSURVEY){
      return this.action;
    } else if (fulfillment.getEngageType() === EngageType.PUNCH){
      const punch: FFData = fulfillment.ffData.find(d => d.type === SymbolType.Action && d.code === 'U');
      const punchAction: FFData = fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'A');
      const punchPurchase: FFData = fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'P');
      const punchCheckin: FFData = fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'K');
      if(punch && punchAction) {
        return this.action;
        // return this.action;
      } else if (punch && punchCheckin) {
        return 'Check-in ' + this.action;
      } else if (punch && punchPurchase) {
        return 'Purchase ' + this.action;
      }
      return this.action;
    } else{
      return '';
    }  
  }
  
  retry() {
    this.tasksFailed = false;
    this.ffService.addFulfillment(this.fulfillment);
  }

  async details() {
    let childPromo: Promo;
    let childPromo1: Promo;
    
    try {
      // if (this.ff.isPromo()) { This is comment because we did not get punchData -> punchCount
        if (this.ff?.getPunchID() != null) {
          childPromo = await this.database.loadPromo(this.ff.getPunchID());
        } else {
          // First child in list
          if(this.ff?.promoIDs?.length > 0){
           childPromo = await this.database.loadPromo(this.ff?.promoIDs[0]);
          }
          // Below code is For AQd because Q it self eCoupon and d is incent Drawing so in wallet create two items 
          // And we want ecoupon status as we so you can check it's used in ff-details.page.html
          if(childPromo?.fulfillment?.getEngageType() == EngageType.PROMOTION  // Engagement PROMO
          && childPromo?.fulfillment?.getBonusType() === BonusType.DRWAING     // First item Drawing and second is eCoupon(this.ff.promoIDs[1])
          && this.ff?.promoIDs?.length > 1){                                   // Id's size mustbe greaterthan 1
            childPromo1 = await this.database.loadPromo(this.ff.promoIDs[1]);
          }
        }
    // }
    } catch (error) {
      // Old code use if exception occur
      // if (this.ff.isPromo()) { This is comment because we did not get punchData -> punchCount
        if (this.ff?.getPunchID() != null) {
          childPromo = await this.database.loadPromo(this.ff.getPunchID());
        } else {
          if(this.ff?.promoIDs?.length > 0){
            childPromo = await this.database.loadPromo(this.ff?.promoIDs[0]);
          }
        }
      // }
    }

    let scanModal = await this.modalCtrl.create({
      component: FfDetailsPage,
      cssClass: 'ff-details-modal',
      componentProps: {
        ff: this.ff,
        promo: childPromo,
        promo1: childPromo1
      }
    });

    scanModal.onDidDismiss().then(itemUpdated => {
      this.onDismissed.emit(itemUpdated.data);
    })

    await scanModal.present();
  }

  async openPromo(event) {
    event.stopPropagation();

    console.log("Open promo from fulfillment card");
    let childPromo: Promo;
    if (this.ff.getPunchID() != null) {
      childPromo = await this.database.loadPromo(this.ff.getPunchID());
    } else {
      childPromo = await this.database.loadPromo(this.ff.promoIDs[0]);
    }
    this.database.updatePromoStatus(childPromo, true);

    let scanModal = await this.modalCtrl.create({
      component: PromoDetailsPage,
      cssClass: 'promo-details-modal',
      componentProps: {
        promo: childPromo
      }
    });

    await scanModal.present();
  }

  async updateFF(event: any) {
    const popover = await this.popover.create({
      component: FfEditPopoverComponent,
      event: event,
      translucent: true,
      cssClass: "ff-edit-popover",
      componentProps: {
        ff: this.ff
      }
    });
    return await popover.present();
  }
}
