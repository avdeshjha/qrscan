// import { ValidatorService } from './../../services/validator.service';
import { Calendar } from '@ionic-native/calendar/ngx';
import { Device } from '@ionic-native/device/ngx';
import { Component, OnInit, ViewChild, NgZone } from '@angular/core';
import { IonContent, ModalController, NavParams, Platform, AlertController, PickerController, LoadingController, IonCheckbox } from '@ionic/angular';
import { Router } from '@angular/router';

import { FFData, Fulfillment, SymbolType, Composite, FFAction, FFState, InputSymbol, ModelService, Interval, PromoType, TaskStatus, Promo, RedeemMethod, EngageType, FFPunchPropertiesParser, DeliveryMethod, Punch, RedeemStatus, EventWGuestData, SurveyData, FiveStarSurveyData, BonusType, PunchData } from 'src/app/services/model.service';
import { Symbol } from 'src/app/services/model.service';
import { InputValidator, ValidatorService } from 'src/app/services/validator.service';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { SymbologyService } from 'src/app/services/symbology.service';
import { DatabaseService, Domain } from 'src/app/services/database.service';
import { StandardQRPage } from 'src/app/modals/standardqr/standardqr.page';
import { FfDetailsPage } from 'src/app/modals/ff-details/ff-details.page';
import { PageName, NavigationService } from 'src/app/services/navigation.service'
import { SocialSharing } from '@ionic-native/social-sharing/ngx';

import { DateTime } from 'luxon';
import { PromoDetailsPage } from '../promo-details/promo-details.page';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

//enum order matters
export enum Step {
  INIT,
  ERROR,
  REDEEM,
  ACTION_APPROVAL,
  MISSING_DATA,
  ACTION_SPECIFIC,
  DATA_APPROVAL,
  COMPLETE,
  EXIT,
  CANCEL,
  PUNCH
}

export enum SubStep {
  //Step.ACTION_SPECIFIC:
  SURVEY,
  FIVESTARSURVEY,
  //Step.ERROR:
  EVENT_WITH_GUEST,
  DATETIME_INTERVAL,
  DUPLICATE,
  REDEEM,
  PUNCH_WITH_ENGAGEMENT,
  PUNCH_WITHOUT_ENGAGEMENT
}

export interface ApprovalElement {
  text: string,
  symbolCode: string,
  symbolType: SymbolType,
  compositeCode: string,
  required: boolean,
  approved: boolean,
  expanded: boolean,
  values: { name: string, value: string }[],
}

@Component({
  selector: 'app-scan',
  templateUrl: './scan.page.html',
  styleUrls: ['./scan.page.scss'],
})
export class ScanPage implements OnInit {

  //template data
  public actionSymbol: Symbol<SymbolType.Action>;
  public approvalElements: ApprovalElement[];
  public promoTypeString: string;
  public surveyQuestion: string;
  public isMultiChoice: boolean;
  public isComment: boolean;
  public isWriteIn: boolean;
  public surveyListOptions: { o: string, selected: boolean }[];
  public commentListOptions: { o: string, selected: boolean }[];
  public ff: Fulfillment;
  public promo: Promo = null;
  public eventWGuest: EventWGuestData = null;
  public survey: SurveyData = null;
  public fiveStarSurvey: FiveStarSurveyData = null
  public punch: PunchData = null;
  public campaignStartDateTime: string;
  public campaignEndDateTime: string;
  public writeChoice: string;
  public writeMultiChoice: string;
  public writeComment: string;
  public surveySelectValue: string
  public survey_radio_button: string;
  guests: number = 0;
  // enum access for html
  EngageType = EngageType;
  BonusType = BonusType;
  // enum access for html
  FFState = FFState;

  //template control
  @ViewChild(IonContent, { static: false }) content: IonContent;

  Step: any = Step;
  step: Step = null;

  SubStep: any = SubStep;
  subStep: SubStep = null;

  missingDataMode: boolean = false;
  missingSurveyMode: boolean = false;

  footerButtons: FooterButton[] = [];
  followUpCalendarCompleted: boolean = false; // follow up cal button
  missingDataValidator: InputValidator;

  dateTimeEarly: boolean = null;
  sfaCancelCalendarOption: boolean = false;

  // Punch Alret Show after done button Check line number 1438 there will be alert
  punchCountDialogShow: boolean = false;
  demoNewCardPromo: Promo = null;

  // for use when processing adding a punch card to a campaign
  private punchFF: Fulfillment;
  // presence of dummyFF indicates there is a dummyFF in the database for an orphan punch and we need to handle replacing the dummy with a true parent FF.
  private dummyFF: Fulfillment;
  // MultiLanguage
  language: any;
  optinRequireText: string;
  // yourTranslatedObservableText : string; 

  //internal
  //These tests are ran in sequence to determine which modal screen(s) a user should see
  private stepTests: (() => Promise<[Step, SubStep]>)[] = [
    () => new Promise(async resolve => {
      console.log('errors test');
      if (!!this.model.sfa) { //sfa

        // duplicate check
        let ffs: Fulfillment[] = await this.database.loadFFs();
        let matches = ffs.filter(existingFF => {
          let idMatch = existingFF.getCampaignID() === this.ff.getCampaignID()
          if (!idMatch) {
            return false;
          }
          if (this.ff.isTrackerEmail() && existingFF.isTrackerEmail()) {
            if (this.ff.getTrackerEmail() === existingFF.getTrackerEmail()) {
              return true;
            } else {
              return false;
            }
          }
          if (this.ff.isTrackerURL() && existingFF.isTrackerURL()) {
            if (this.ff.getTrackerURL() === existingFF.getTrackerURL()) {
              return true;
            } else {
              return false;
            }
          }
          return false;
        });
        if (matches.length > 0) {
          // if (this.ff.getEngageType() === EngageType.PUNCH){
          // if (this.ff.getEngageType() === EngageType.PUNCH && FFPunchPropertiesParser.is_pCode(this.ff.ffData)) {
          if (FFPunchPropertiesParser.is_pCode(this.ff.ffData)) {
            // check if cCode or pCode. If cCode, it's a duplicate.
            if (FFPunchPropertiesParser.getPunchesNeeded(this.ff.ffData)
            || (EngageType.PUNCH != this.ff.getEngageType() && this.ff.isPunch())) {
              if (matches[0].isDummy) {
                resolve([Step.PUNCH, SubStep.PUNCH_WITHOUT_ENGAGEMENT]);
                return;
              } else {
                this.punchFF = matches[0];
                resolve([Step.PUNCH, SubStep.PUNCH_WITH_ENGAGEMENT]);
                return;
              }
            } else {
              if (!matches[0].isDummy) {
                if (matches[0].isCanceled()) {
                  this.reopenPrompt(matches[0]);
                  this.modalCtrl.dismiss();
                  return;
                }
                resolve([Step.ERROR, SubStep.DUPLICATE]);
                return;
              } else {
                this.dummyFF = matches[0];
              }
            }
          } else if (matches[0].isCanceled()) {            
            this.reopenPrompt(matches[0]);
            this.modalCtrl.dismiss();
            return;
          }
          if (!this.model.allowDuplicates) {
            if (!matches[0].isDummy) {
              resolve([Step.ERROR, SubStep.DUPLICATE]);
              return;
            } else {
              this.dummyFF = matches[0];
            }
          }
        } else if (this.ff.getEngageType() === EngageType.PUNCH || FFPunchPropertiesParser.is_pCode(this.ff.ffData)) {
          // if not duplicate, check if pCode or cCode by checking for punches needed field that only exists on pCodes
          // cCode proceeds normally through rest of the step checking
          // if (FFPunchPropertiesParser.getPunchesNeeded(this.ff.ffData)) {
          // Above 3 line not used it's deprecated now you can identify it's pcode with '2' - actionOption
          if (EngageType.PUNCH != this.ff.getEngageType() && this.ff.isPunch() && FFPunchPropertiesParser.is_pCode(this.ff.ffData)) {
            // this._translate.get('084').subscribe((res: string) => {
            //   // console.log('resorce string',res);
            //   this.optinRequireText = res;
            //   this.showRegisterRequire()
              
            // });
            this.optinRequireText = 'res';
            this.showRegisterRequire()
            return;
          } else if (FFPunchPropertiesParser.is_pCode(this.ff.ffData)) {
            resolve([Step.PUNCH, SubStep.PUNCH_WITHOUT_ENGAGEMENT]);
            return;
          }
        }

        if (this.actionSymbol.code === 'R') {
          resolve([Step.ERROR, SubStep.REDEEM]);
          return;
        }

        let interval: Interval = this.ff.getCampaignInterval();
        console.log('interval', interval.start);

        if ((!!interval.start && interval.start.diffNow() > 0)) {
          console.log('not started yet');
          this.dateTimeEarly = true;
          resolve([Step.ERROR, SubStep.DATETIME_INTERVAL]);
          return;
        }

        if ((!!interval.end && interval.end.diffNow() < 0)) {
          console.log('expired');
          console.log(interval.end);
          this.dateTimeEarly = false;
          resolve([Step.ERROR, SubStep.DATETIME_INTERVAL]);
          return;
        }

        resolve(null);

      } else { //redeem

        if (this.actionSymbol.code !== 'R') {
          resolve([Step.ERROR, SubStep.REDEEM]);
          return;
        }

        let interval: Interval = this.ff.getCampaignInterval();

        if ((!!interval.start && interval.start.diffNow() > 0)) {
          console.log('not started yet');
          this.dateTimeEarly = true;
          resolve([Step.ERROR, SubStep.DATETIME_INTERVAL]);
          return;
        }

        if ((!!interval.end && interval.end.diffNow() < 0)) {
          console.log('expired');
          console.log(interval.end);
          this.dateTimeEarly = false;
          resolve([Step.ERROR, SubStep.DATETIME_INTERVAL]);
          return;
        }
        resolve(null);
      }
    }),
    () => new Promise(async resolve => {
      console.log('redeem test');
      if (!!this.model.sfa) { //sfa
        resolve(null);
      } else { //redeem
        resolve([Step.REDEEM, null]);
      }
    }),
    () => new Promise(resolve => {
      console.log('action approval test');
      if (!!this.model.sfa) { //sfa
        resolve(this.actionSymbol.composites[0].alert ? [Step.ACTION_APPROVAL, null] : null);
      } else { //redeem
        resolve(null);
      }
    }),
    () => new Promise(resolve => {
      console.log('missing data test');
      if (!!this.model.sfa) { //sfa
        // fill in value for age composite before validation
        let ageData: FFData = this.ff.ffData
          .find(d => d.type === SymbolType.User && d.code === '2' && d.composites.some(c => c.code === '4'));
        if (!!ageData) {
          ageData.composites.find(comp => comp.code === '4').value = this.validator.calcAge(ageData);
        }

        let inputSymbols: InputSymbol<SymbolType.User>[] =
          this.ffService.makeInputSymbols<SymbolType.User>(SymbolType.User, this.ff.ffData);

        this.missingDataValidator = this.validator.getUserInputValidator(inputSymbols);
        this.missingDataValidator.isValid = this.missingDataValidator.validate(this.missingDataMode);

        resolve(this.missingDataValidator.isValid ? null : [Step.MISSING_DATA, null]);
      } else { //redeem
        resolve(null);
      }
    }),
    () => new Promise(resolve => {
      console.log('action specific test');
      if (!!this.model.sfa) { //sfa
        // for (let index = 0; index < this.ff.ffData.length; index++) {
        //   const element = this.ff.ffData[index];
        //   console.log('Element: ' + element.code + ' ' + element.type);
        // }
        
        if (this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')) {
          if (this.ff.ffData.find(d => d.code === 'J')) {
            resolve([Step.ACTION_SPECIFIC, SubStep.SURVEY]);
          } else if (this.ff.ffData.find(d => d.code === 'S')) {
            resolve([Step.ACTION_SPECIFIC, SubStep.FIVESTARSURVEY]);
          }
        } else if (this.ff.ffData.find(d => d.type === SymbolType.Action && d.code === 'E')) {
          resolve([Step.ACTION_SPECIFIC, SubStep.EVENT_WITH_GUEST]);
        } else {
          resolve(null);
        }
      } else { //redeem
        resolve(null);
      }
    }),
    () => new Promise(async resolve => {
      console.log('data approval test');
      if (!!this.model.sfa) { //sfa
        this.approvalElements = [];
        for (let i = 0; i < this.ff.ffData.length; i++) {
          let data = this.ff.ffData[i];
          if (data.type !== SymbolType.User) continue;

          let symbol: Symbol<SymbolType.User> =
            await this.database.loadSymbolValues<SymbolType.User>(
              this.symbology.getSymbol<SymbolType.User>(SymbolType.User, data.code)
            );

          let symbolAlert: boolean = symbol.composites.find(comp => comp.code === symbol.code).alert;

          symbol.composites
            .filter((composite: Composite) => symbolAlert || !!composite.alert)
            .filter((composite: Composite) => data.composites.find(dComp => dComp.code === composite.code))
            .forEach((composite: Composite) => {
              const dataComp = data.composites.find(dComp => dComp.code === composite.code);

              let values = [];
              if (!!dataComp.value) {
                values = [{
                  name: 'Value',
                  value: dataComp.value
                }];
              } else {
                composite.partCodes.forEach(partCode => {
                  let dataPart = data.parts.find(part => part.code === partCode);
                  if (!!dataPart) {
                    values.push({
                      name: symbol.parts.find(part => part.code === partCode).text,
                      value: dataPart.value
                    });
                  }
                });
              }

              if (values.some(v => !!v.value && v.value.length > 0)) {
                const approvalElement: ApprovalElement = {
                  text: composite.text ? composite.text : symbol.text,
                  symbolCode: symbol.code,
                  symbolType: symbol.type,
                  compositeCode: composite.code,
                  required: dataComp.required,
                  approved: true,
                  expanded: false,
                  values: values
                };
                this.approvalElements.push(approvalElement);
              }
            });
        }

        this.approvalElements = this.approvalElements.sort((a, b) => {
          if (a.required && !b.required) return -1;
          if (!b.required && a.required) return 1;
          return 0;
        });

        resolve(this.approvalElements.length > 0 ? [Step.DATA_APPROVAL, null] : null);

      } else { //redeem
        resolve(null);
      }
    }),
    () => new Promise(resolve => {
      console.log('complete test');
      if (!!this.model.sfa) { //sfa
        resolve([Step.COMPLETE, null]);
      } else { //redeem
        resolve(null);
      }
    }),
    () => new Promise(resolve => {
      console.log('exit test');
      resolve([Step.EXIT, null]);
    }),
    () => new Promise(resolve => {
      console.log('cancel test');
      resolve([Step.CANCEL, null]);
    }),
  ];

  constructor(
    private symbology: SymbologyService,
    private database: DatabaseService,
    private validator: ValidatorService,
    private ffService: FulfillmentService,
    private navParams: NavParams,
    private modalCtrl: ModalController,
    private alertController: AlertController,
    private calendar: Calendar,
    private ng: NgZone,
    public platform: Platform,
    public model: ModelService,
    private navigation: NavigationService,
    private device: Device,
    private pickerController: PickerController,
    private loadingController: LoadingController,
    private social: SocialSharing,
  ) {
    this.step = Step.INIT;
  }

  async ngOnInit() {
    let qrData: string = this.navParams.get('qrData');
    let deviceString: string = (<any>window).cordova ? this.device.uuid : 'browser';

    this.ff = new Fulfillment(
      null,
      qrData,
      DateTime.utc(),
      deviceString,
      FFState.SUBMITTED
    );

    this.ff = await this.ffService.initializeFFData(this.ff);

    if (!this.ff) {
      // TODO reinstate this alert when we are able to open the standard scan before launching this modal.
      // const alert = await this.alertController.create({
      //   header: 'Unrecognized QR Code',
      //   // message: '',
      //   // message: this.actionSymbol.text,
      //   buttons: [{
      //     text: 'Okay',
      //     handler: (async () => {
      //       await this.modalCtrl.dismiss();
      //     }).bind(this)
      //   }]
      // });

      // await alert.present();
      // return;

      let standardScanModal = await this.modalCtrl.create({
        component: StandardQRPage,
        componentProps: { qrData: qrData }
      });

      standardScanModal.onDidDismiss().then(() => this.modalCtrl.dismiss());

      await standardScanModal.present();
      return;
    }

    let actionData: FFData = this.ff.ffData.find(d => d.type === SymbolType.Action);
    this.actionSymbol = await this.database.loadSymbolValues(
      this.symbology.getSymbol<SymbolType.Action>(SymbolType.Action, actionData.code)
    );

    let actionOptions: FFData[] = this.ff.ffData.filter(d => d.type === SymbolType.ActionOption);
    if (!!actionOptions) {
      this.sfaCancelCalendarOption = actionOptions.some(d => d.code === 'o');
      //todo other options
    }

    const interval = this.ff.getCampaignInterval();
    const startDate: DateTime = interval.start ? interval.start : null;
    const endDate: DateTime = interval.end ? interval.end : null;
    console.log("ffdata: " + JSON.stringify(this.ff.ffData));


    if (startDate != null) {
      this.campaignStartDateTime = this.ffService.dateToHumanReadable(startDate);
    }
    if (endDate != null) {
      this.campaignEndDateTime = this.ffService.dateToHumanReadable(endDate);
    }

    // Original code 
    // let promoActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    // let promoOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    // // let eTicketOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
    // let promoType: PromoType;
    // if (promoActionData || promoOptionData) {
    //   this.promoTypeString = PromoType.COUPON.toString();
    //   promoType = PromoType.COUPON;
    // }
    // // if (eTicketOptionData) {
    // //   this.promoTypeString = PromoType.VOUCHER.toString();
    // //   promoType = PromoType.VOUCHER;
    // // }
    // if (promoType != null) {
    //   console.log("Making promo");

    //   this.promo = this.database.generatePromo(this.ff, null, this.ffService.makePromoQrData(this.ff), promoType);
    // } else {
    //   console.log("Not making promo");

    // }

    let not_pCode = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === '2')); // not pCode
    let promoActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    let promoOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    // let eTicketOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
    let promoType: PromoType;
    if (promoOptionData) {
      this.promoTypeString = PromoType.COUPON.toString();
      promoType = PromoType.COUPON;
    }
    // if (eTicketOptionData) {
    //   this.promoTypeString = PromoType.VOUCHER.toString();
    //   promoType = PromoType.VOUCHER;
    // }
    if (promoType != null || promoActionData) {
      if (not_pCode == null) {
        console.log("Making promo");
        this.promo = this.database.generatePromo(this.ff, null, this.ffService.makePromoQrData(this.ff), promoType);
      }
    } else {
      console.log("Not making promo");

    }

    let eventActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'E' || d.code === 'D')); // Event and Event w/ Guest
    if(eventActionData != null && not_pCode == null){
      this.eventWGuest = this.database.generateEventWithGuest(this.ff, null, this.ffService.makeEventWithGuestQrData(this.ff));
      this.eventWGuest.guestSelected = 0;
      this.guests = 0;
    }

    let SurveyActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'J')); // Survey
    if(SurveyActionData != null && not_pCode == null){
      this.survey = this.database.generateSurvey(this.ff, null, this.ffService.makeSurveyQrData(this.ff));
    }

    let FiveStarSurveyActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'S')); // 5 Star Survey
    if(FiveStarSurveyActionData != null && not_pCode == null){
      this.fiveStarSurvey = this.database.generateFiveStarSurvey(this.ff, null, this.ffService.makeSurveyQrData(this.ff));
    }

    let punchData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'U')); // punch
    if(punchData != null && not_pCode == null){
      this.punch = this.database.generatePunchForData(this.ff, null, this.ffService.makeSurveyQrData(this.ff),null);
    }

    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });

    await this.goToNextStep();

  }

  // window controls
  async goToNextStep(cancelOptions?: boolean): Promise<void> {
    try {

      let next: [Step, SubStep] = !!cancelOptions ? [Step.CANCEL, null] : await this.getNextStep();

      console.log('next:');
      console.table(next);

      console.log('next:' + next[0]);
      console.log('Approval:' + Step.ACTION_APPROVAL);
      //controller prepare for next step:
      switch (next[0]) {
        //can do things like define screen specific footer buttons here
        case Step.ERROR:
          switch (next[1]) {
            case SubStep.DATETIME_INTERVAL:
              this.footerButtons = [
                {
                  text: "Done",
                  icon: "close",
                  callback: (async () => { await this.closeModal() }).bind(this)
                },
                this.getDetailsButtons(),
              ].filter(val => {
                return val != null
              });;
              break;
            case SubStep.DUPLICATE:
              this.footerButtons = [
                {
                  text: "cScan",
                  icon: "camera",
                  callback: (() => {
                    this.closeModal();
                    this.navigation.openPage(PageName.CAMERA);
                  }).bind(this)
                }, {
                  text: "Pending",
                  icon: "file-tray",
                  callback: (() => {
                    this.closeModal();
                    this.navigation.openPage(PageName.PENDING);
                  }).bind(this)
                }, {
                  text: "History",
                  icon: "newspaper",
                  callback: (() => {
                    this.closeModal();
                    this.navigation.openPage(PageName.HISTORY);
                  }).bind(this)
                },
                this.getDetailsButtons(),
              ].filter(val => {
                return val != null
              });;
              break;
            case SubStep.REDEEM:
              this.footerButtons = [
                {
                  text: "Done",
                  icon: "close",
                  callback: (async () => { await this.closeModal() }).bind(this)
                },
                this.getDetailsButtons(),
              ].filter(val => {
                return val != null
              });
              break;
          }
          break;

        case Step.ACTION_APPROVAL:
          // let promoActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
          // let eTicketOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
          // if (promoActionData) {
          //   this.promoTypeString = PromoType.COUPON.toString();
          // }
          // if (eTicketOptionData) {
          //   this.promoTypeString = PromoType.VOUCHER.toString();
          // }
          this.footerButtons = [
            {
              text: "Cancel",
              icon: "close",
              callback: (async () => { await this.closeModal() }).bind(this)
            }, {
              text: "Approve",
              icon: "chevron-forward",
              callback: (async () => { await this.goToNextStep() }).bind(this),
              highlight: true
            }].filter(val => {
              return val != null
            });
          break;

        case Step.ACTION_SPECIFIC:
          switch (next[1]) {
            case SubStep.SURVEY:
              // todo is there a better location to assign this field?
              this.surveyQuestion = this.ff.getSurveyQuestion();
              this.isMultiChoice = this.ff.isMultiChoice();
              this.isComment = this.ff.isComment();
              this.isWriteIn = this.ff.isWriteIn();
              console.log("Survey Question: " + this.surveyQuestion);
              console.log("MultiChoice Question: " + this.isMultiChoice);
              console.log("Comment: " + this.isComment);
              console.log("0.Write-In: " + this.isWriteIn + " : " + this.writeChoice);
              console.log("0.MultiSelect: " + this.isMultiChoice + " : " + this.writeMultiChoice);
              console.log("0.Comment: " + this.isComment + " : " + this.writeComment);
              this.footerButtons = [
                {
                  text: "Cancel*",
                  icon: "close",
                  callback: (async () => { await this.closeModal() }).bind(this)
                },
                this.getDetailsButtons(),
                {
                  text: "Continue",
                  icon: "chevron-forward",
                  callback: (() => {
                    this.inputWriteInChoiceValue(this.writeChoice);
                    this.inputWriteInMultiChoiceValue(this.writeMultiChoice);
                    this.inputCommentValue(this.writeComment);
                    this.missingSurveyMode = true;
                    this.content.scrollToTop();
                  }).bind(this),
                  highlight: true
                }].filter(val => {
                  return val != null
                });
              break;
            case SubStep.FIVESTARSURVEY:
              // todo is there a better location to assign this field?
              this.surveyQuestion = this.ff.getSurveyQuestion();
              this.isMultiChoice = this.ff.isMultiChoice();
              this.isComment = this.ff.isComment();
              this.isWriteIn = this.ff.isWriteIn();
              console.log("Survey Question: " + this.surveyQuestion);
              console.log("MultiChoice Question: " + this.isMultiChoice);
              console.log("Comment: " + this.isComment);
              console.log("Write-In: " + this.isWriteIn);
              this.footerButtons = [
                {
                  text: "Cancel*",
                  icon: "close",
                  callback: (async () => { await this.closeModal() }).bind(this)
                },
                this.getDetailsButtons(),
                {
                  text: "Continue",
                  icon: "chevron-forward",
                  callback: (() => {
                    this.missingSurveyMode = true;
                    this.content.scrollToTop();
                  }).bind(this),
                  highlight: true
                }].filter(val => {
                  return val != null
                });
            break;
            case SubStep.EVENT_WITH_GUEST:
              this.footerButtons = [
                {
                  text: "Cancel",
                  icon: "close",
                  callback: (async () => { await this.closeModal() }).bind(this)
                },
                this.getDetailsButtons(),
                {
                  text: "Continue",
                  icon: "chevron-forward",
                  callback: (async () => {
                    this.ff.setGuests(this.guests);
                    await this.goToNextStep();
                  }).bind(this),
                  highlight: true
                }].filter(val => {
                  return val != null
                });
              break;
            default:
              console.log("Unexpected action specific substep: " + next[1]);
              break;
          }
          break;

        case Step.MISSING_DATA:
          this.footerButtons = [{
            text: "Cancel",
            icon: "close",
            callback: (async () => { await this.closeModal() }).bind(this)
          },
          this.getDetailsButtons(),
          {
            text: "Continue",
            icon: "chevron-forward",
            callback: (() => {
              this.missingDataMode = true;
              this.content.scrollToTop();
              this.missingDataValidator.isValid = this.missingDataValidator.validate(this.missingDataMode);
            }).bind(this),
            highlight: true
          }].filter(val => {
            return val != null
          });
          break;

        case Step.DATA_APPROVAL:
          this.footerButtons = [
            {
              text: "Cancel",
              icon: "close",
              callback: (async () => { await this.closeModal() }).bind(this)
            },
            this.getDetailsButtons(),
            {
              text: "Approve",
              icon: "chevron-forward",
              callback: (async () => {
                this.approvalElements.forEach(a => {
                  this.ff.ffData
                    .find(d => d.type === a.symbolType && d.code === a.symbolCode)
                    .composites
                    .find(c => c.code === a.compositeCode)
                    .skip = !a.approved;
                });
                await this.goToNextStep();
              }).bind(this),
              highlight: true
            }].filter(val => {
              return val != null
            });
          break;

        case Step.PUNCH:
          switch (next[1]) {
            case SubStep.PUNCH_WITH_ENGAGEMENT:
              this.processPunchWithEngagement();
              break;
            case SubStep.PUNCH_WITHOUT_ENGAGEMENT:
              this.processPunchWithoutEngagement();
              break;
          }
          this.modalCtrl.dismiss();
          break;

        case Step.COMPLETE:
          console.log("in step complete");

          let loading = await this.loadingController.create({
            message: 'Please wait...',
            duration: 10000
          });

          let complete: boolean = false;

          await loading.present();

          this.ff.ffAction = FFAction.REGISTER;
          this.ff.state = FFState.SUBMITTED;

          let unsubscribe = new Subject();
          this.ff.statusSubject.pipe(
            takeUntil(unsubscribe)
          ).subscribe((data) => {
            console.log("Status Subject changed: " + JSON.stringify(data));
            if (data == TaskStatus.COMPLETE || data == TaskStatus.FAILED) {
              unsubscribe.next();
              console.log("Got the complete!");
              complete = true;
              if (!!this.dummyFF) {
                this.processDummy();
              }
              loading.dismiss();
            }
          });

          this.ffService.addFulfillment(this.ff);

          await loading.onDidDismiss();

          this.footerButtons = [
            this.getRedeemButton(),
            {
              text: "Done",
              icon: "checkmark",
              callback: (async () => {
                await this.closeModal();
                setTimeout(() => {
                  if(this.punchCountDialogShow && this.demoNewCardPromo != null && this.demoNewCardPromo != undefined){
                    this.alertController.create({
                    header: 'Punch Card Added',
                    message: 'Loyalty ePunch Card has been created and added to the campaign. Loyalty ePunch card progress is ' + this.demoNewCardPromo.punch.punchCount + ' out of ' + this.demoNewCardPromo.punch.punchesRequired + '!',
                    buttons: [{
                      text: 'Okay',
                      handler: (async () => { 
                        this.punchCountDialogShow = false;
                        this.demoNewCardPromo = null;
                      }).bind(this)
                      }]
                    }).then(alert => {
                      alert.present();
                    });
                  }      
                }, 500);
              }).bind(this),
              highlight: true
            },
          ].filter(val => {
            return val != null
          });
          break;

        case Step.CANCEL:
          this.footerButtons = [
            {
              text: "Share",
              icon: "share",
              callback: (() => console.log('todo')).bind(this)
            },
            this.getDetailsButtons(),
            {
              text: "Done",
              icon: "chevron-forward",
              callback: (async () => await this.closeModal()).bind(this),
              highlight: true
            }].filter(val => {
              return val != null
            });
          break;

        case Step.EXIT:
          await this.modalCtrl.dismiss();
          return;

        case Step.REDEEM:
          this.footerButtons = [
            {
              text: "Cancel",
              icon: "close",
              callback: (async () => { await this.closeModal() }).bind(this)
            },
            this.getDetailsButtons(),
            {
              text: "Redeem",
              icon: "chevron-forward",
              callback: (async () => {
                this.ff.ffAction = FFAction.REDEEM;
                this.ff.state = FFState.SUBMITTED;
                this.ffService.addFulfillment(this.ff);
                await this.goToNextStep();
              }).bind(this),
              highlight: true
            }].filter(val => {
              return val != null
            });
          break;
      }

      //change screen:
      this.subStep = next[1];
      this.step = next[0];

    } catch (err) {
      console.error(err);
      alert('scan.page.goToNextStep() err: ' + err);
    }
  }

  private async getNextStep(): Promise<[Step, SubStep]> {
    //let stepTests = !!this.model.sfa ? this.stepTestsSFA : this.stepTestsRedeem;
    try {
      console.log('current step: ' + this.step);
      console.log("1.Write-In: " + this.isWriteIn + " : " + this.writeChoice);
      console.log("1.MultiSelect: " + this.isMultiChoice + " : " + this.writeMultiChoice+ " : " + this.selectedArray);
      console.log("1.Comment: " + this.isComment + " : " + this.writeComment);
      this.inputCommentValue(this.writeComment);

      if(this.isMultiChoice) {
        this.selectedArray.push(this.writeMultiChoice);
      }

      console.log("1.writeMultiChoice: " + this.writeMultiChoice);

      for (let i = this.step.valueOf(); i < this.stepTests.length; i++) {
        let next: [Step, SubStep] = await this.stepTests[i]();
        if (!!next) {
          console.log('next step: ' + next);
          return next;
        }
      }

    } catch (err) {
      console.error(err);
      alert('scan.page.getNextStep() err: ' + err);
    }
  }

  //survey screen
  async surveySelect(o: string) {

    this.missingSurveyMode = false;

    this.isWriteIn = false
    
    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });

    this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
      .parts[0] = { code: 'O', value: o };

    this.surveyListOptions.forEach(e => e.selected = (e.o === o));

    this.survey_radio_button = "1";
    this.surveySelectValue = o;
    console.log('0.surveySelect: ' + o);
    console.log('0.writeIn: ' + this.isWriteIn);

  }

  //survey screen
  async fiveStarRatingsurveySelect(event : any) {
    // let o : string = event.detail.value;
    this.data = event.detail.value;

    this.missingSurveyMode = false;

    this.isWriteIn = false
    
    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });

    this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
      .parts[0] = { code: 'O', value: this.data };

    // this.surveyListOptions.forEach(e => e.selected = (e.o === o));

    this.surveySelectValue = this.data;
    console.log('0.Five Star Rating Survey Select: ' + this.data);
    console.log('0.writeIn: ' + this.isWriteIn);

  }

  selectedArray :any = [];
  data : string;
  async surveySelectCheckBox(event : any){
    this.missingSurveyMode = false;
    this.data = event.detail.value;

    this.isWriteIn = false

    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });
    
    if(event.detail.checked && !this.selectedArray.some(e => e === this.data)) {
      this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O').parts[0] = { code: 'O', value: this.selectedArray };
      this.selectedArray.push(this.data);

    } else {
      const index = this.selectedArray.indexOf(this.data)
      if(index != -1)
        this.selectedArray.splice(index, 1);
    }

    console.log('0.Survey Multi Select: ' + this.selectedArray);
   }

   async inputWriteInChoiceValue(o : string){
    
    this.missingSurveyMode = false;
    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });

    this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
      .parts[0] = { code: 'O', value: o };

    this.surveyListOptions.forEach(e => e.selected = (e.o === o));

    console.log('0.Survey Write-In Value: ' + o);
   }

   async inputWriteInMultiChoiceValue(o : string){
    
    this.missingSurveyMode = false;
    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });

    this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O').parts[0] = { code: 'O', value: this.selectedArray };
    this.selectedArray.push(this.data);

    console.log('0.Survey Write-In Multi Select Value: ' + this.selectedArray);
   }

   async inputCommentValue(o : string){
    // console.log('0.Survey Comment ffData: ' + this.ff.ffData);
    // console.log('0.Survey Comment Code: ' + d.code);
    this.footerButtons = [
      {
        text: "Cancel",
        icon: "close",
        callback: (async () => { await this.closeModal() }).bind(this)
      },
      this.getDetailsButtons(),
      {
        text: "Continue",
        icon: "chevron-forward",
        callback: await this.goToNextStep.bind(this),
        highlight: true
      },
    ].filter(val => {
      return val != null
    });

    this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
      .parts[1] = { code: 'C', value: o };
    // this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
    //   .parts[0] = { code: 'O', value: this.surveySelectValue };

    // this.commentListOptions.forEach(e => e.selected = (e.o === o));

    // this.ff.setComments(o);
    console.log('0.Survey Comment Value: ' + o);
    console.log('0.Survey Select Value: ' + this.surveySelectValue);
   }

  getSurveyOptions(ff: Fulfillment): { o: string, selected: boolean }[] {
    if (!!this.surveyListOptions) return this.surveyListOptions;

    //todo move to ff.service.ts
    this.surveyListOptions = ff.ffData
      .find(d => d.type === SymbolType.QRCode && d.code === 'O').parts
      .map(part => { return { o: part.value, selected: false } });
    this.surveyListOptions = this.surveyListOptions.slice(1);
    return this.surveyListOptions;
  }

  // getComments(ff: Fulfillment): { o: string, selected: boolean }[] {
  //   if (!!this.commentListOptions) return this.commentListOptions;

  //   //todo move to ff.service.ts
  //   this.commentListOptions = ff.ffData
  //     .find(d => d.type === SymbolType.QRCode && d.code === 'C').parts
  //     .map(part => { return { o: part.value, selected: false } });
  //   this.commentListOptions = this.commentListOptions.slice(1);
  //   return this.commentListOptions;
  // }

  async closeModal() {
    if (this.step === Step.COMPLETE || this.step === Step.CANCEL || (this.step === Step.ERROR) && (this.subStep === SubStep.DUPLICATE)) {
      await this.modalCtrl.dismiss();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Are you sure?',
      message: 'If you cancel now, you will lose your scan and any data you may have entered. You will be returned to the scan screen where you may restart the process.',
      buttons: [
        {
          text: 'Yes Cancel',
          handler: (async () => {
            console.log('current step: ' + this.step);
            if (this.sfaCancelCalendarOption) {
              await this.goToNextStep(true);
            } else {
              await this.modalCtrl.dismiss();
            }
            this.ff.ffAction = FFAction.LOST;
            this.ffService.addFulfillment(this.ff);
          }).bind(this)
        }, {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
          }
        }
      ]
    });

    await alert.present();

  }

  /*
  Follow up Actions
  */
  async followUpCalendar() {
    // if (this.followUpCalendarCompleted) return;
    // this.followUpCalendarCompleted = true;

    const interval = this.ff.getEventInterval();
    const startDate: DateTime = interval.start ? interval.start : null;
    const endDate: DateTime = interval.end ? interval.end : null;

    const title: string = this.ff.getDescription();
    const org: string = this.ff.getOrg();
    const notes: string = org ? 'Provided by ' + org : null;

    // user setting
    // let calSymbol: Symbol<SymbolType.User> = await this.database.loadSymbolValues(this.symbology.getSymbol(SymbolType.User, 'T'));
    // let calName: string = null;
    // if (!!calSymbol) {
    //   calName = calSymbol.parts[0].value;
    // }

    if (!(<any>window).cordova) return;
    //begin cordova only stuff:


    let calId = null;
    let calName;
    await this.calendar.listCalendars()
      .then((cals: []) => {
        //alert(JSON.stringify(cals, null, 2));
        //let primaryCal: any = cals.find((c: any) => c.calendarName === calName); //user setting

        let primaryCal: any = cals.find((c: any) => c.isPrimary); //android default
        if (!!primaryCal) {
          calId = primaryCal.id;
          calName = primaryCal.name;
          return;
        }

        let homeCal: any = cals.find((c: any) => c.name === 'Home'); //ios default
        if (!!homeCal) {
          calId = homeCal.id;
          calName = homeCal.name;
          return;
        }

        let anyCal: any = cals.find((c: any) => true); //non default
        if (!!anyCal) {
          calId = anyCal.id;
          calName = anyCal.name;
          return;
        }

      })
      .catch(error => { alert(error) });

    //alert('cal ID: ' + calId + ', title: ' + title);

    if (!!calId) {
      let options = this.calendar.getCalendarOptions();
      options.calendarId = calId;
      options.firstReminderMinutes = 10;

      let foundEventData = await this.calendar.findEvent(
        title,
        null,
        notes,
        !!startDate ? startDate.toJSDate() : null,
        !!endDate ? endDate.toJSDate() : null
      );

      if (foundEventData.length > 0 && !confirm("Event already exists in calendar. Add anyways?")) {
        console.log("Event already found on calendar and user has chosen to cancel adding event again");
        return;
      }

      // await this.calendar.createEventWithOptions(
      //   title,
      //   null,
      //   notes,
      //   !!startDate ? startDate.toJSDate() : null,
      //   !!endDate ? endDate.toJSDate() : null,
      //   options
      // );

      let ret = await this.calendar.createEventInteractivelyWithOptions(
        title,
        null,
        notes,
        !!startDate ? startDate.toJSDate() : null,
        !!endDate ? endDate.toJSDate() : null,
        options
      );
      //alert(startDate);
      //alert(endDate);
      //.then((msg) => { alert('msg: ' + JSON.stringify(msg)) }, (err) => { alert('err: ' + err) })
      //.catch(error => alert(JSON.stringify(error, null, 2)));

      //TODO !!tie this to createEventWithOptions() promise!!
      // const alert = await this.alertController.create({
      //   header: 'Success',
      //   message: JSON.stringify(ret),
      //   buttons: [{
      //     text: 'Okay',
      //     handler: (async () => { }).bind(this)
      //   }]
      // });

      this.followUpCalendarCompleted = true;
      // await alert.present();

    } else {
      alert('No suitable calendar could be found. Add a calendar to your calendar app and try again.');
    }
  }

  async share() {
    this.social.share("QR Advantage");
  }

  async missingDataRevalidate() {
    console.log('revalidate')
    this.missingDataValidator.isValid = this.missingDataValidator.validate(this.missingDataMode);

    if (this.missingDataValidator.isValid) {
      this.missingDataMode = false;
      this.footerButtons = [
        {
          text: "Cancel",
          icon: "close",
          callback: await this.closeModal.bind(this)
        },
        this.getDetailsButtons(),
        {
          text: "Continue",
          icon: "chevron-forward",
          callback: (async () => {
            for (let i = 0; i < this.missingDataValidator.symbols.length; i++) {
              await this.database.saveSymbolValues(this.missingDataValidator.symbols[i]);
            }
            this.missingDataValidator.symbols.forEach(symbol => {
              let ffData: FFData = this.ff.ffData.find(data => data.code === symbol.code && data.type === symbol.type);

              // console.log('assimilate symbols into ffData:');
              // console.table(symbol.parts);
              // console.table(symbol.composites);
              symbol.parts
                .filter(part => !!part.value)
                .forEach(part => {
                  let dPart = ffData.parts.find(dPart => dPart.code === part.code);
                  if (!!dPart) {
                    dPart.value = part.value;
                  }
                });
              symbol.composites
                .filter(comp => !!comp.value)
                .forEach(comp => {
                  let dComp = ffData.composites.find(dComp => dComp.code === comp.code);
                  if (!!dComp) {
                    dComp.value = comp.value;
                  }
                });
            });
            // console.log('ff.ffData after assimilation:');
            // console.table(this.ff.ffData);

            await this.goToNextStep();
          }).bind(this),
          highlight: true
        },
      ].filter(val => {
        return val != null
      });
      console.log('valid');

    } else {
      this.footerButtons = [
        {
          text: "Cancel",
          icon: "close",
          callback: await this.closeModal.bind(this)
        },
        this.getDetailsButtons(),
        {
          text: "Continue",
          icon: "chevron-forward",
          callback: (() => {
            this.missingDataMode = true;
            this.content.scrollToTop();
            this.missingDataValidator.isValid = this.missingDataValidator.validate(this.missingDataMode);
          }).bind(this),
          highlight: false
        },
      ].filter(val => {
        return val != null
      });
      console.log('not valid');
    }

  }

  async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getDetailsButtons(): FooterButton {
    return {
      text: "Details",
      icon: "search",
      callback: () => this.openDetails(this.ff, this.promo)
    };
  }

  // getPromoButton(): FooterButton {
  //   if (this.ff.isPromo()) {
  //     return {
  //       text: "Incent Det",
  //       icon: "pricetags",
  //       callback: () => this.openPromo(this.promo, true)
  //     }
  //   } else {
  //     return null;
  //   }
  // }

  getRedeemButton(): FooterButton {
    if (this.ff.isPromo() && this.ff.getRedeemMethod() == RedeemMethod.QUICK) {
      return {
        text: "Quick Redeem",
        icon: "checkmark-outline",
        callback: () => this.openPromo(this.promo, false)
      }
    } else {
      return null;
    }
  }

  async openDetails(fulfillment: Fulfillment, promo: Promo) {
    console.log("Open details");

    let scanModal = await this.modalCtrl.create({
      component: FfDetailsPage,
      cssClass: 'ff-details-modal',
      componentProps: {
        ff: fulfillment,
        promo: promo,
        isPreview: true
      }
    });

    await scanModal.present();
  }

  async openPromo(promo: Promo, preview: boolean) {
    console.log("Open promo");

    let scanModal = await this.modalCtrl.create({
      component: PromoDetailsPage,
      cssClass: 'promo-details-modal',
      componentProps: {
        promo: promo,
        isPreview: preview
      }
    });

    await scanModal.present();
  }

  async openGuestPicker() {
    let maxGuests = this.ff.getMaxGuests();
    let guestsArray = [];
    for (var i = 0; i <= maxGuests; i++) {
      guestsArray.push({ text: i.toString(), value: i });
    }
    let picker = await this.pickerController.create({
      columns: [
        {
          name: 'guests',
          options: guestsArray
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Confirm',
          handler: (val) => {
            console.log(JSON.stringify(val));
            this.guests = val.guests.value;
            this.eventWGuest.guestSelected = val.guests.value;
          }
        }
      ]
    });

    await picker.present();
  }

  private async processPunchWithEngagement() {
    let punchLoading: HTMLIonLoadingElement = await this.loadingController.create({
      message: 'Please wait...',
      duration: 10000
    });
    await punchLoading.present();
    this.modalCtrl.dismiss();
    // check if in date range
    let interval: Interval = this.ff.getCampaignInterval();

    if ((!!interval.start && interval.start.diffNow() > 0)) {
      console.log('punch not started yet');
      punchLoading.dismiss();
      this.alertController.create({
        header: 'Promo Not Started',
        message: 'We are sorry, but the ePunch Code you scanned does not start until ' + this.ff.getFormattedEventStart() + ' and cannot be applied.',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        alert.present();
      })
      return;
    }
    if ((!!interval.end && interval.end.diffNow() < 0)) {
      console.log('punch expired');
      console.log(interval.end);
      punchLoading.dismiss();
      this.alertController.create({
        header: 'Promo Expired',
        message: 'We are sorry, but the ePunch Code you scanned has expired on ' + this.ff.getFormattedEventEnd() + ' and cannot be applied.',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        alert.present();
      })
      return;
    }

    if (this.punchFF === null) {
      console.log("Parent punch for punch campaign not found. Should be set prior during stepTests");
      punchLoading.dismiss();
      this.alertController.create({
        header: 'Punch Error',
        message: 'Parent campaign for the punch card could not be found.',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        alert.present();
      });
      return;
    }

    if (this.punchFF.isCanceled()) {
      punchLoading.dismiss();
      let reopen: boolean = await this.showCancelledPunchAlert();
      if (reopen) {
        let loading = await this.loadingController.create({
          message: 'Please wait...',
          duration: 10000
        });

        await loading.present();

        this.punchFF.ffAction = FFAction.REOPEN;
        // this.punchFF.state = FFState.REGISTERED;
        // this.punchFF.setCanceled(false);
        this.database.setFFandChildrenCanceledState(this.punchFF, false);

        let unsubscribe = new Subject();
        this.punchFF.statusSubject.pipe(
          takeUntil(unsubscribe)
        ).subscribe((data) => {
          console.log("Status Subject changed: " + JSON.stringify(data));
          if (data == TaskStatus.COMPLETE || data == TaskStatus.FAILED) {
            unsubscribe.next();
            loading.dismiss();
          }
        });

        this.ffService.addFulfillment(this.punchFF);
        await loading.onDidDismiss();
      } else {
        return;
      }
    }

    // check if campaign has punch attached
    if (this.punchFF.getPunchID()) {
      let punchPromo: Promo = await this.database.loadPromo(this.punchFF.getPunchID());
      if (punchPromo.punch.punchCount >= punchPromo.punch.punchesRequired && punchPromo.punch.cardCount >= punchPromo.punch.cardLimit) {
        // all punch cards allocated completed
        punchLoading.dismiss();
        this.alertController.create({
          header: 'Punch not applied',
          message: 'All allocated punch cards have been completed',
          buttons: [{
            text: 'Okay',
            handler: (async () => { }).bind(this)
          }]
        }).then(alert => {
          alert.present();
        })
        return;
      }
      punchPromo.punch.punchCount++;
      // check if card is complete
      if (punchPromo.punch.punchCount >= punchPromo.punch.punchesRequired) {
        this.processCompleteCard(punchPromo, this.punchFF);
        punchLoading.dismiss();
      } else {
        // save incremented punch
        await this.database.savePromo(punchPromo);

        this.punchFF.ffAction = FFAction.PUNCH_CHECK_IN;
        this.punchFF.setActionResponse(punchPromo.punch.punchCount + '');
        this.ffService.addFulfillment(this.punchFF);

        punchLoading.dismiss();
        this.alertController.create({
          header: 'Punch Added',
          message: 'Punch applied to card. Loyalty ePunch card progress is ' + punchPromo.punch.punchCount + ' out of ' + punchPromo.punch.punchesRequired + '!',
          buttons: [{
            text: 'Okay',
            handler: (async () => { }).bind(this)
          }]
        }).then(alert => {
          alert.present();
        });
        return;
      }
    } else {
      // create new punch and attach to parent campaign
      // console.log("parent idddd ---> ",this.punchFF.databaseID);
      let parentFF: Fulfillment = await this.database.loadFF(this.punchFF.databaseID);
      let newCardPromo: Promo = this.database.generatePunch(this.ff, this.ffService.makePromoQrData(this.ff), this.punchFF.databaseID, true, parentFF);
      newCardPromo.punch.punchCount++;
      if (newCardPromo.punch.punchCount >= newCardPromo.punch.punchesRequired) {
        this.punchFF.setPunchID(newCardPromo.databaseID);
        await this.database.saveFF(this.punchFF);

        this.processCompleteCard(newCardPromo, this.punchFF);
        punchLoading.dismiss();
      } else {
        newCardPromo.redeemStatus = RedeemStatus.OPEN;        
        this.punchFF.setPunchID(newCardPromo.databaseID);

        await this.database.savePromo(newCardPromo);
        await this.database.saveFF(this.punchFF);

        this.punchFF.ffAction = FFAction.PUNCH_CHECK_IN;
        this.punchFF.setActionResponse(newCardPromo.punch.punchCount + '');
        this.ffService.addFulfillment(this.punchFF);

        punchLoading.dismiss();
        this.alertController.create({
          header: 'Punch Card Added',
          message: 'Loyalty ePunch Card has been created and added to the campaign. Loyalty ePunch card progress is ' + newCardPromo.punch.punchCount + ' out of ' + newCardPromo.punch.punchesRequired + '!',
          buttons: [{
            text: 'Okay',
            handler: (async () => { }).bind(this)
          }]
        }).then(alert => {
          alert.present();
        });
      }
      return;
      // }
    }
  }

  private async processPunchWithoutEngagement() {
    let punchLoading: HTMLIonLoadingElement = await this.loadingController.create({
      message: 'Please wait...',
      duration: 10000
    });
    await punchLoading.present();
    this.modalCtrl.dismiss();

    // check if punch already scanned
    let duplicatePunches: Promo[] = (await this.database.loadPromos()).filter(promo => {
      return promo.type === PromoType.PUNCH;
    }).filter(promo => {
      return promo?.punch?.campaignID === this.ff.getCampaignID();
    }).filter(promo => {
      if (this.ff.isTrackerEmail()) {
        if (promo.punch.deliveryMethod === DeliveryMethod.EMAIL) {
          return this.ff.getTrackerEmail() === promo.punch.destinationAddress;
        }
      } else if (this.ff.isTrackerURL()) {
        if (promo.punch.deliveryMethod === DeliveryMethod.REST) {
          return this.ff.getTrackerURL() === promo.punch.destinationAddress;
        }
      }
      return false;
    });

    if (duplicatePunches.length > 0) {
      punchLoading.dismiss();
      this.alertController.create({
        header: 'Punch cannot be applied',
        message: 'Please scan parent campaign code in order to apply further punches',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        alert.present();
      })
    } else {
      // check if in date range
      let interval: Interval = this.ff.getCampaignInterval();      

      if ((!!interval.start && interval.start.diffNow() > 0)) {
        console.log('punch not started yet');
        punchLoading.dismiss();
        this.alertController.create({
          header: 'Promo Not Started',
          message: 'Cannot apply punch. Promotion starts on: ' + this.ff.getFormattedEventStart(),
          buttons: [{
            text: 'Okay',
            handler: (async () => { }).bind(this)
          }]
        }).then(alert => {
          alert.present();
        })
        return;
      }
      if ((!!interval.end && interval.end.diffNow() < 0)) {
        console.log('punch expired');
        console.log(interval.end);
        punchLoading.dismiss();
        this.alertController.create({
          header: 'Promo Expired',
          message: 'Cannot apply punch. Promotion has expired on: ' + this.ff.getFormattedEventEnd(),
          buttons: [{
            text: 'Okay',
            handler: (async () => { }).bind(this)
          }]
        }).then(alert => {
          alert.present();
        })
        return;
      }
      // add punch
      punchLoading.dismiss();
      this.alertController.create({
        header: 'No Loyalty ePunch Card Found',
        message: 'There was no Loyalty ePunch Card found to this apply this ePunch code to. Do you want to save the ePunch and opt-in later?',
        buttons: [{
          text: 'Yes',
          handler: async () => {
            console.log("Accepted");
            let punchLoading: HTMLIonLoadingElement = await this.loadingController.create({
              message: 'Please wait...',
              duration: 10000
            });
            await punchLoading.present();

            let cardPromo: Promo = this.database.generatePunch(this.ff, this.ffService.makePromoQrData(this.ff), null, false, null);
            cardPromo.redeemStatus = RedeemStatus.NO_CARD;
            await this.database.savePromo(cardPromo);

            this.ff.ffAction = FFAction.PUNCH_ORPHAN;
            this.ff.setActionResponse(cardPromo.punch.punchCount + '');
            this.ff.isDummy = true;
            this.ff.setPunchID(cardPromo.databaseID);
            this.ffService.addFulfillment(this.ff);

            punchLoading.dismiss();
            this.alertController.create({
              header: 'Success',
              message: 'Punch added. Please scan parent campaign code in order to add further punches.',
              buttons: [{
                text: 'Okay',
                handler: (async () => { }).bind(this)
              }]
            }).then(alert => {
              alert.present();
            });
          }
        }, {
          text: 'No',
          handler: () => { console.log("rejected") }
        }]
      }).then(alert => {
        alert.present();
      });
    }
  }

  private async processDummy() {
    this.ff.setPunchID(this.dummyFF.getPunchID());
    let punchPromo: Promo = await this.database.loadPromo(this.ff.getPunchID());

    // attach orphan punch to campaign
    punchPromo.parentID = this.ff.databaseID;
    this.ff.setPunchID(punchPromo.databaseID);
    punchPromo.punch.punchCount = punchPromo.punch.starterPunches + 1;
    // delete dummyFF
    await this.database.delete(this.dummyFF.databaseID);

    if (punchPromo.punch.punchCount >= punchPromo.punch.punchesRequired) {
      console.log("Calling processCompleteCard from processDummy");

      this.processCompleteCard(punchPromo, this.ff);
    } else {
      punchPromo.redeemStatus = RedeemStatus.OPEN;
      await this.database.saveFF(this.ff);
      await this.database.savePromo(punchPromo);

      this.ff.ffAction = FFAction.PUNCH_CHECK_IN;
      this.ff.setActionResponse(punchPromo.punch.punchCount + '');
      this.ffService.addFulfillment(this.ff);


      this.punchCountDialogShow = true;
      this.demoNewCardPromo = punchPromo;
      // this.alertController.create({
      //   header: 'Punch Added',
      //   message: 'Punch applied to card. ePunch card progress is ' + punchPromo.punch.punchCount + ' out of ' + punchPromo.punch.punchesRequired + '!',
      //   buttons: [{
      //     text: 'Okay',
      //     handler: (async () => { }).bind(this)
      //   }]
      // }).then(alert => {
      //   alert.present();
      // });
    }
  }

  private async processCompleteCard(punchPromo: Promo, parentFF: Fulfillment) {
    // generate reward
    let newPromoID: string = this.database.generateID(Domain.PROMO);
    let punchRewardPromo: Promo = this.database.generatePunchIncentive(punchPromo, newPromoID, this.ffService.makePromoQrData(this.ff), this.ff.getPromoType(), this.ff.ffData);
    parentFF.promoIDs.push(newPromoID);

    if (punchPromo.punch.cardCount >= punchPromo.punch.cardLimit) {
      // final card completed
      punchPromo.redeemStatus = RedeemStatus.CLOSED;
      await this.database.savePromo(punchRewardPromo);
      await this.database.savePromo(punchPromo);

      parentFF.ffAction = FFAction.PUNCH_REWARD;
      parentFF.setActionResponse(punchPromo.punch.cardCount + '');
      this.ffService.addFulfillment(parentFF);

      this.alertController.create({
        header: 'Punch Added',
        message: 'Punch card completed. Reward has been added to your wallet. All allocated punch cards have been completed.',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        alert.present();
      });
      return;
    } else {
      // reset punch count to 0, increment card count, and create promo item
      punchPromo.punch.cardCount++;
      punchPromo.punch.punchCount = 0;
      punchPromo.redeemStatus = RedeemStatus.OPEN;

      await this.database.savePromo(punchRewardPromo);
      await this.database.savePromo(punchPromo);
      await this.database.saveFF(parentFF);

      parentFF.ffAction = FFAction.PUNCH_REWARD;
      parentFF.setActionResponse(punchPromo.punch.cardCount - 1 + '');
      this.ffService.addFulfillment(parentFF);

      this.alertController.create({
        header: 'Punch Added',
        message: 'Punch card completed. Reward has been added to your wallet. A new punch card has been created.',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        alert.present();
      });
      return;
    }
  }
  
  private showCancelledPunchAlert(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const confirm = await this.alertController.create({
        header: 'Parent Engagement Cancelled',
        message: 'Punch cannot be applied while the parent engagement is cancelled. Do you want to reopen the engagement and apply the punch?',
        buttons: [
          {
            text: 'Yes',
            handler: () => {
              return resolve(true);
            },
          },
          {
            text: 'No',
            role: 'cancel',
            handler: () => {
              return resolve(false);
            },
          },
        ],
      });

      await confirm.present();
    });
  }

  private reopenPrompt(ff: Fulfillment) {
    console.log("reopen prompt");
    this.alertController.create({
      header: 'Found Canceled Engagement',
      message: 'Duplicate canceled engagement found. Do you want to reopen the engagement?',
      buttons: [{
        text: 'Yes',
        handler: (async () => {
          let loading = await this.loadingController.create({
            message: 'Please wait...',
            duration: 10000
          });
  
          await loading.present();
  
          ff.ffAction = FFAction.REOPEN;
          this.database.setFFandChildrenCanceledState(ff, false);
  
          let unsubscribe = new Subject();
          ff.statusSubject.pipe(
            takeUntil(unsubscribe)
          ).subscribe((data) => {
            console.log("Status Subject changed: " + JSON.stringify(data));
            if (data == TaskStatus.COMPLETE || data == TaskStatus.FAILED) {
              unsubscribe.next();
              loading.dismiss();
            }
          });
  
          this.ffService.addFulfillment(ff);
          await loading.onDidDismiss();
        }).bind(this)
      }, {
        text: 'No',
        role: 'cancel'
      }]
    }).then(alert => {
      alert.present();
    });
  }

  private showRegisterRequire(): Promise<boolean> {
    return new Promise(async (resolve) => {
      await this.alertController.create({
        header: 'Opt-In Required',
        message: this.optinRequireText,
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      }).then(alert => {
        this.modalCtrl.dismiss();
        setTimeout(() => {
          alert.present();
        }, 100);
      });
    });
  }

 
  // MultiLanguage
  // private showMultiLanguageAlert(): Promise<boolean> {
  //   return new Promise(async (resolve) => {
  //     const confirm = await this.alertController.create({
  //       header: '',
  //       message: this.yourTranslatedObservableText,
  //       buttons: [
  //         {
  //           text: 'Cancel',
  //           role: 'cancel',
  //           handler: () => {
  //             return resolve(false);
  //           },
  //         },
  //         {
  //           text: 'Ok',
  //           handler: () => {
  //             return resolve(true);
  //           },
  //         },
  //       ],
  //     });

  //     await confirm.present();
  //   });
  // }
}
