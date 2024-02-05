import { Component, OnInit } from '@angular/core';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { NavParams, ModalController, AlertController, PopoverController, ToastController } from '@ionic/angular';
import { Fulfillment, InputSymbol, SymbolType, FFData, FFState, FFAction, TaskStatus, PromoType, UpdateState, Promo, ModelService, EngageType, EventWGuestData, SurveyData, BonusType, PunchData, FiveStarSurveyData } from 'src/app/services/model.service';
import { Symbol } from 'src/app/services/model.service';
import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { SymbologyService } from 'src/app/services/symbology.service';
import { DatabaseService } from 'src/app/services/database.service';
import { PopoverComponent } from 'src/app/components/popover/popover.component';
import { DateTime, Settings } from 'luxon';
import { Calendar } from '@ionic-native/calendar/ngx';
import { SurveyPage } from '../survey/survey.page';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { EventWGuestPage } from '../eventwguest/eventwguest.page';


@Component({
  selector: 'app-ff-details',
  templateUrl: './ff-details.page.html',
  styleUrls: ['./ff-details.page.scss'],
})
export class FfDetailsPage implements OnInit {

  //template control
  buttons: FooterButton[] = [];
  editMode: boolean = false;

  taskStatus: TaskStatus;
  // enum access for html
  FFState = FFState;
  UpdateState = UpdateState;
  EngageType = EngageType;

  updated: boolean = false;
  public promoTypeString: string;

  isPromo: boolean;
  cancelButton: FooterButton;
  updateButton: FooterButton;

  provider: string;
  procTimeStr: string;

  eventDetails = {
    Site: null,
    StartDateTime: null,
    EndDateTime: null
  }

  surveyDetails = {
    Question: null,
    Selection: null
  }

  fiveStarSurveyDetails = {
    Question: null,
    Selection: null
  }

  // promoDetails = {
  //   Description:null,
  //   ItemDescription:null,
  //   Price:null,
  //   Limit:null,
  //   Site:null,
  //   SiteLocation:null,
  //   StartDateTime:null,
  //   EndDateTime:null,
  // }
  BonusType = BonusType;

  promo: Promo = new Promo(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  promo1: Promo = new Promo(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  punch: PunchData = new PunchData(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  eventWGuest: EventWGuestData = new EventWGuestData(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  survey: SurveyData = new SurveyData(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  fiveStarSurvey: FiveStarSurveyData = new FiveStarSurveyData(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  isPreview: boolean = false;

  //data
  ff: Fulfillment;
  inputSymbols: InputSymbol<SymbolType.User>[];
  actionSymbol: Symbol<any>;

  constructor(
    public navParams: NavParams,
    public ffService: FulfillmentService,
    public symbology: SymbologyService,
    public modal: ModalController,
    public alert: AlertController,
    public database: DatabaseService,
    private popoverController: PopoverController,
    private calendar: Calendar,
    private privateModal: ModalController,
    private model: ModelService,
    private clipboard: Clipboard,
    private toast: ToastController
  ) { }

  async ngOnInit() {
    this.ff = this.navParams.get('ff');
    this.ff.updateStatus();

    this.promo = this.navParams.get('promo');
    this.promo1 = this.navParams.get('promo1');
   
  
    let eventActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'E' || d.code === 'D')); // Event And Event w/ Guest
    if(eventActionData != null){
      this.eventWGuest = this.database.generateEventWithGuest(this.ff, null, this.ffService.makeEventWithGuestQrData(this.ff));
    }

    let surveyActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'J')); // Survey
    if(surveyActionData != null){
      this.survey = this.database.generateSurvey(this.ff, null, this.ffService.makeSurveyQrData(this.ff));
    }

    let fiveStarSurveyActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'S')); // 5 Star Survey
    if(fiveStarSurveyActionData != null){
      this.survey = this.database.generateSurvey(this.ff, null, this.ffService.makeSurveyQrData(this.ff));
    }

    let punchData = this.ff.ffData.find(d => d.type === SymbolType.Action && (d.code === 'U')); // punch
    let not_pCode = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === '2')); // not pCode
    console.log("punchData: " + punchData);
    console.log("not_pCode: " + not_pCode);
    if(punchData != null && (not_pCode == null || not_pCode == undefined)){
      this.punch = this.database.generatePunchForData(this.ff, null, this.ffService.makeSurveyQrData(this.ff), this.promo?.punch);
    }

    if (this.navParams.get("isPreview")) {
      this.isPreview = this.navParams.get("isPreview");
    }

    this.isPromo = this.ff.isPromo();

    let viewModeButtons: FooterButton[];

    let cancelButton: FooterButton = {
      text: "Cancel",
      icon: "close",
      callback: (async () => {
        if (this.editMode) {
          this.editMode = false;
          this.buttons = viewModeButtons;
        } else {
          await this.closeModal(false);
        }
      }).bind(this)
    };
    this.cancelButton = cancelButton;

    let updateButton: FooterButton = {
      text: "Send Update",
      icon: "send",
      callback: (async () => {
        this.editMode = false;
        this.buttons = viewModeButtons;
        this.update();
      }).bind(this)
    };
    this.updateButton = updateButton;

    // let editButton: FooterButton = {
    //   text: "Edit",
    //   icon: "create",
    //   callback: (async () => {
    //     this.editMode = true;
    //     this.buttons = [cancelButton, updateButton];
    //   }).bind(this)
    // };

    let deleteButton: FooterButton = {
      text: "Opt-Out",
      icon: "trash",
      callback: (async () => {
        const alert = await this.alert.create({
          header: 'Delete this QRA?',
          message: 'Warning! You will be unable to edit a deleted QRA',
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary',
              handler: () => {
              }
            }, {
              text: 'Delete',
              handler: (async () => {
                const interval = this.ff.getCampaignInterval();
                const endDate: DateTime = interval.end ? interval.end : null;
                
                if (DateTime.local() < endDate) {
                  console.log("Won't delete campaign. Not expired. Canceling... Now: " + DateTime.local() + " Campaign end: " + endDate);

                  await this.database.setFFandChildrenCanceledState(this.ff, true);
                  this.ff.ffAction = FFAction.CANCEL;
                  this.ffService.addFulfillment(this.ff);
                  this.closeModal(true);
                  return;
                }

                await this.database.deleteFFandChildren(this.ff);
                await this.closeModal(true);
              }).bind(this)
            }
          ]
        });

        await alert.present();

      }).bind(this)
    };

    let retryButton: FooterButton = {
      text: "Retry",
      icon: "chevron-up",
      callback: (async () => {
        this.ff.ffAction = FFAction.UPDATE;
        this.ffService.addFulfillment(this.ff);
        this.alert.create({
          header: 'Retry Attempted',
          message: 'Retry has been attempted',
          buttons: [{
            text: 'Okay',
            handler: (async () => { }).bind(this)
          }]
        }).then(alert => {
          alert.present();
        });
      }).bind(this)
    };

    this.ff.statusSubject.subscribe(s => {
      this.taskStatus = s;
      switch (s) {
        case TaskStatus.COMPLETE:
          if (this.ff.state == FFState.AT_LIMIT) {
            viewModeButtons = [cancelButton, retryButton, deleteButton];
          } else {
            viewModeButtons = [cancelButton, deleteButton];
          }
          break;
        case TaskStatus.FAILED:
          // if (this.ff.state === FFState.CANCELED) {
          //   viewModeButtons = [cancelButton, deleteButton];
          // } else {
          viewModeButtons = [cancelButton, retryButton, deleteButton];
          // }
          break;
        case TaskStatus.IN_PROGRESS:
          viewModeButtons = [cancelButton, deleteButton];
          break;
        default:
          viewModeButtons = [cancelButton];
          break;
      }

      if (!this.editMode) this.buttons = viewModeButtons;

    });

    this.inputSymbols = this.ffService.makeInputSymbols<SymbolType.User>(SymbolType.User, this.ff.ffData, true);
    let data: FFData = this.ff.ffData.find(d => d.type === SymbolType.Action);
    this.actionSymbol = this.symbology.getSymbol<SymbolType.Action>(SymbolType.Action, data.code);

    if (this.isPromo) {
      let promoActionData = this.ff.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
      let promoOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
      // let eTicketOptionData = this.ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
      // if (promoActionData || promoOptionData) {
      //   this.promoTypeString = PromoType.COUPON.toString();
      // }
      if (promoOptionData) {
        this.promoTypeString = PromoType.COUPON.toString();
      }
      // if (eTicketOptionData) {
      //   this.promoTypeString = PromoType.VOUCHER.toString();
      // }
    }

    this.provider = this.ff.getOrg();
    let procTimeMs = this.ff.processedTime;

    if (procTimeMs !== undefined) {
      Settings.defaultZoneName = "LOCAL";
      this.procTimeStr = this.ffService.dateToHumanReadable(DateTime.fromMillis(procTimeMs));
      Settings.defaultZoneName = "UTC";
    }

    console.log("getEngageType: " + this.ff.getEngageType());
    // Event
    switch(this.ff.getEngageType()) {
      case EngageType.EVENT_REGISTRATION:
      case EngageType.EVENT_WITH_GUEST:
      case EngageType.PUNCH:
        // site
        this.eventDetails.Site = this.ff.getSite();

        // site location - skip, not implemented on controlcenter atm

        // start time
        const interval = this.ff.getEventInterval();
        const startDate: DateTime = interval.start ? interval.start : null;
        const endDate: DateTime = interval.end ? interval.end : null;

        if (startDate != null) {
          this.eventDetails.StartDateTime = this.ffService.dateToHumanReadable(startDate);
        }

        // end time
        if (endDate != null) {
          this.eventDetails.EndDateTime = this.ffService.dateToHumanReadable(endDate);
        }
        break;
      case EngageType.SURVEY:
        this.surveyDetails.Question = this.ff.getSurveyQuestion();
        if (!this.isPreview) {
          this.surveyDetails.Selection = this.ff.getSurveySelection();
        }
        
        console.log("Survey Details Question: " + this.surveyDetails.Question);
        console.log("Survey Details Answer: " + this.surveyDetails.Selection);
        console.log("0.Survey Details Comment: " + this.ff.getComments());
        break;
      case EngageType.FIVESTARSURVEY:
        this.fiveStarSurveyDetails.Question = this.ff.getSurveyQuestion();
        if (!this.isPreview) {
          this.fiveStarSurveyDetails.Selection = this.ff.getFiveStarSurveySelection();
        }

        console.log("Survey Five Star Details Question: " + this.fiveStarSurveyDetails.Question);
        console.log("Survey Five Star Details Answer: " + this.fiveStarSurveyDetails.Selection);
        console.log("0.Survey Five Star Details Comment: " + this.ff.getComments());
      break;
    }

     // For epunchNo card when we use AQUA or AEUA etc.
     if(this.promo?.getParentCampaign() == null && this.promo?.parentID == null && this.promo?.type == PromoType.PUNCH){
      try {
        let ffs: Fulfillment[] = await this.database.loadFFs();
        let fulfillments: Fulfillment[] = ffs.filter(ff => {
          // !ff.tasks.every(t => t.status !== TaskStatus.COMPLETE);
          return ff.isDummy && ff.getPunchID() == this.promo.databaseID;
        });
        if (fulfillments.length == 1) {
          this.promo.setParentCampaign(fulfillments[0])
        }
      } catch (error) {
        
      }
    }
  }

  closeModal(modified: boolean) {
    this.modal.dismiss(modified);
  }

  validate() {
    //todo
  }

  update() {
    this.inputSymbols.forEach(symbol => {
      let ffData: FFData = this.ff.ffData.find(data => data.code === symbol.code && data.type === symbol.type);
      symbol.parts
        .filter(part => !!part.value)
        .forEach(part => {
          let dPart = ffData.parts.find(dPart => dPart.code === part.code);
          if (!!dPart) {
            dPart.value = part.value;
          }
        });
    });
    this.ff.ffAction = FFAction.UPDATE;
    this.ffService.addFulfillment(this.ff);
  }

  async openMore(ev) {
    let options = [];
    // let cancelString = "Cancel Engagement";
    let editString = "Edit";
    let shareString = "Share";
    let calendarString = "Add to Calendar";
    let databaseIDString = "Get databaseID";

    if (this.ff.isSurvey()) {
      let expired: boolean = this.ff.getCampaignInterval().end < DateTime.local();
    
      options = [
        // [cancelString, this.ff.state === FFState.REGISTERED],
        // [editString, this.ff.state !== FFState.CANCELED && !expired],
        [editString, !expired],
        [shareString, false]
      ];
    } else if (this.ff.isFiveStarSurvey()) {
      let expired: boolean = this.ff.getCampaignInterval().end < DateTime.local();
    
      options = [
        // [cancelString, this.ff.state === FFState.REGISTERED],
        // [editString, this.ff.state !== FFState.CANCELED && !expired],
        [editString, !expired],
        [shareString, false]
      ];
    } else if (this.ff.getEngageType() === EngageType.EVENT_WITH_GUEST) {
      let expired: boolean = this.ff.getCampaignInterval().end < DateTime.local();
    
      options = [
        // [cancelString, this.ff.state === FFState.REGISTERED],
        // [editString, this.ff.state !== FFState.CANCELED && !expired],
        [editString, !expired],
        [shareString, false]
      ];
    } else {
      // options = [[cancelString, this.ff.state === FFState.REGISTERED], [shareString, false]];
      options = [[shareString, false]];
    }
    if (this.ff.getEngageType() === EngageType.EVENT_REGISTRATION || this.ff.getEngageType() === EngageType.EVENT_WITH_GUEST) {
      options.push([calendarString, true]);
    }
    if (this.model.showPush) {
      options.push([databaseIDString, true]);
    }

    const popover = await this.popoverController.create({
      component: PopoverComponent,
      event: ev,
      componentProps: { fields: options },
      cssClass: 'popover_class',
    });

    // this.events.subscribe("fromPopoverEvent", async (arg) => {
    //   if (arg == cancelString) this.cancel();
    //   else if (arg == calendarString) this.addToCalendar();
    //   else if (arg == editString) {
    //     // this.editMode = true;
    //     // this.buttons = [this.cancelButton, this.updateButton];
    //     let standardScanModal = await this.privateModal.create({
    //       component: SurveyPage,
    //       componentProps: { ff: this.ff }
    //     });

    //     standardScanModal.present();
    //   }
    // })
    popover.onDidDismiss().then(arg => {
      let data = arg.data;

      // if (data == cancelString) this.cancel();
      if (data == calendarString) this.addToCalendar();
      else if (data == editString) {
        switch(this.ff.getEngageType()) {
          case EngageType.SURVEY:
            this.privateModal.create({
              component: SurveyPage,
              componentProps: { ff: this.ff }
            }).then(modal => modal.present());
            break;
          case EngageType.FIVESTARSURVEY:
            this.privateModal.create({
              component: SurveyPage,
              componentProps: { ff: this.ff }
            }).then(modal => modal.present());
            break;
          case EngageType.EVENT_WITH_GUEST:
            this.privateModal.create({
              component: EventWGuestPage,
              componentProps: { ff: this.ff }
            }).then(modal => modal.present());
            break;
          default:
            console.log("Unexpected engagetype for edit request: " + this.ff.getEngageType());
            break;
        }
      }
      else if (data == databaseIDString) {        
        let alertMessage = "Database ID: " + this.ff.databaseID;
        if (this.ff.isPromo()) {
          alertMessage += "<br />Promo IDs: " + JSON.stringify(this.ff.promoIDs);
        }
        this.alert.create({
          header: 'Database ID',
          message: alertMessage,
          buttons: [{
            text: 'Copy',
            handler: (async () => {
              await this.clipboard.copy(alertMessage);
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
    })
    await popover.present();
  }

  // async cancel() {
  //   const alert = await this.alert.create({
  //     header: 'Are you sure?',
  //     message: 'Once you cancel your engagement, you will lose your entry to any drawing and you will no longer be able to complete a redemption tied to this engagement.',
  //     buttons: [{
  //       text: 'Yes Cancel',
  //       handler: (async () => {
  //         this.ff.ffAction = FFAction.CANCEL;
  //         this.ffService.addFulfillment(this.ff);
  //         this.updated = true;
  //       }).bind(this)
  //     },
  //     {
  //       text: 'No',
  //       handler: (async () => { }).bind(this)
  //     }]
  //   });

  //   await alert.present();
  // }

  async addToCalendar() {
    const interval = this.ff.getEventInterval();
    const startDate: DateTime = interval.start ? interval.start : null;
    const endDate: DateTime = interval.end ? interval.end : null;

    const title: string = this.ff.getDescription();
    const org: string = this.ff.getOrg();
    const notes: string = org ? 'Provided by ' + org : null;

    if (!(<any>window).cordova) return;
    //begin cordova only stuff:


    let calId = null;
    let calName;
    await this.calendar.listCalendars()
      .then((cals: []) => {

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

    if (!!calId) {
      let options = this.calendar.getCalendarOptions();
      options.calendarId = calId;

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

      await this.calendar.createEventInteractivelyWithOptions(
        title,
        null,
        notes,
        !!startDate ? startDate.toJSDate() : null,
        !!endDate ? endDate.toJSDate() : null,
        options
      );

      //TODO !!tie this to createEventWithOptions() promise!!
      const alert = await this.alert.create({
        header: 'Success',
        message: title + ' added to ' + calName + ' calendar.',
        buttons: [{
          text: 'Okay',
          handler: (async () => { }).bind(this)
        }]
      });

      await alert.present();
    } else {
      alert('No suitable calendar could be found. Add a calendar to your calendar app and try again.');
    }
  }
}
