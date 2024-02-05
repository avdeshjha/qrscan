import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

import { Promo, RestPostTask, EmailTask, PromoGenTask, Task, TaskType, Fulfillment, FFData, Symbol, ModelService, SystemSettings, PromoType, SymbolType, RedeemStatus, RedeemMethod, RedeemSource, Punch, PunchType, FFPunchPropertiesParser, DeliveryMethod, Interval, EventWGuestData, EngageType, BonusType, SurveyData, FiveStarSurveyData, PunchData } from './model.service';
import { DateTime } from 'luxon';


export enum Domain {
  SYMBOL,
  FULFILLMENT,
  PROMO,
  SYSTEM
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {

  settingsID: string = Domain.SYSTEM + '.0';

  constructor(
    public storage: Storage,
  ) { }

  generateID(domain: Domain): string {
    return domain + '.' + Date.now(); // todo use UUID Generation?
  }

  generateIDNew(domain: Domain,lateTime: number): string {
    let dateValue : number = Date.now() + lateTime;
    return domain + '.' + dateValue; // todo use UUID Generation?
  }

  async saveSystemSettings(settings: SystemSettings) {
    let dbObj = {
      timeout: settings.timeout,
      readerID: settings.readerID,
    };
    await this.storage.set(this.settingsID, dbObj)
  }

  async loadSystemSettings(): Promise<SystemSettings> {
    let s: any = await this.storage.get(this.settingsID);

    //System settings defaults:
    if (!s) return new SystemSettings(this.settingsID, 30, '');

    return new SystemSettings(this.settingsID, s.timeout, s.readerID);
  }

  async systemSettingsExist(): Promise<boolean> {
    for (let key of await this.storage.keys()) {
      if (key == this.settingsID) return true;
    }
    return false;
  }

  async savePromo(promo: Promo) {
    let dbObj = {
      databaseID: promo.databaseID,
      parentID: promo.parentID,
      qrData: promo.qrData,
      redeemStatus: promo.redeemStatus,
      initiateTime: promo.initiateTime,
      description: promo.description,
      org: promo.org,
      type: promo.type,
      startDateTime: promo.startDateTime,
      endDateTime: promo.endDateTime,
      itemDescription: promo.itemDescription,
      price: promo.price,
      limit: promo.limit,
      site: promo.site,
      location: promo.location,
      addedTime: promo.addedTime,
      redeemMethod: promo.redeemMethod,
      redeemMethodAllowed: promo.redeemMethodAllowed,
      redeemSource: promo.redeemSource,
      campaignDescription: promo.campaignDescription,
      punch: promo.punch,
      canceled: promo.isCanceled()
    };
    await this.storage.set(promo.databaseID, dbObj);
  }

  // async saveEvent(event: EventWGuestData) {
  //   let dbObj = {
  //     databaseID: event.databaseID,
  //     parentID: event.parentID,
  //     qrData: event.qrData,
  //     redeemStatus: event.redeemStatus,
  //     initiateTime: event.initiateTime,
  //     description: event.description,
  //     org: event.org,
  //     type: event.type,
  //     startDateTime: event.startDateTime,
  //     endDateTime: event.endDateTime,
  //     itemDescription: event.itemDescription,
  //     price: event.price,
  //     limit: event.limit,
  //     site: event.site,
  //     location: event.location,
  //     addedTime: event.addedTime,
  //     redeemMethod: event.redeemMethod,
  //     redeemMethodAllowed: event.redeemMethodAllowed,
  //     redeemSource: event.redeemSource,
  //     campaignDescription: event.campaignDescription,
  //     punch: event.punch,
  //     canceled: event.isCanceled()
  //   };
  //   await this.storage.set(event.databaseID, dbObj);
  // }

  async loadPromo(databaseID: string): Promise<Promo> {
    let dbObj = await this.storage.get(databaseID);
    if (!dbObj) return null;
    let promoFromStorage: Promo = JSON.parse(JSON.stringify(dbObj)) as Promo;
    let promo = new Promo(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    Object.assign(promo, promoFromStorage);
    // console.log("promo",promo.org);
    if (promo.parentID != null) {
      promo.setParentCampaign(await this.loadFF(promo.parentID));
    }

    if (promo.type === PromoType.PUNCH && promoFromStorage.punch !== undefined) {
      let punch: Punch = JSON.parse(JSON.stringify(promoFromStorage.punch)) as Punch;
      let punchObject: Punch = new Punch();
      Object.assign(punchObject, punch);

      promo.punch = punchObject;
    }

    return promo;
  }

  // async loadEvent(databaseID: string): Promise<EventWGuestData> {
  //   console.log("event id",databaseID);
  //   let dbObj = await this.storage.get(databaseID);
  //   if (!dbObj) return null;
  //   console.log("hi",dbObj);
  //   console.log("hi1",JSON.parse(JSON.stringify(dbObj)))
  //   let eventFromStorage: EventWGuestData = JSON.parse(JSON.stringify(dbObj)) as EventWGuestData;
  //   console.log("hi2",eventFromStorage);
    
  //   let event = new EventWGuestData(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
  //   Object.assign(event, eventFromStorage);
  //   if (event.parentID != null) {
  //     event.setParentCampaign(await this.loadFF(event.parentID));
  //   }
  //   console.log("Event",eventFromStorage.org);
    

  //   return ;
  // }

  async loadPromos(): Promise<Promo[]> {
    let data: Promo[] = [];
    for (let key of await this.storage.keys()) {
      if (key.startsWith(Domain.PROMO.toString())) {
        // let p: any = await this.storage.get(key);
        // let promoFromStorage: Promo = JSON.parse(JSON.stringify(p)) as Promo;
        // let promo = new Promo(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
        // Object.assign(promo, promoFromStorage);
        // promo.setParentCampaign(await this.loadFF(promo.parentID));

        let promo: Promo = await this.loadPromo(key);

        data.push(promo);
        // data.push(new Promo(p.id, p.parentID, p.qrData, p.redeemStatus, p.initiateTime, p.desc, 
        //   p.org, p.type, p.startDateTime, p.endDateTime, p.itemDescription, p.price, p.limit, p.site, p.location, p.addedTime));
      }
    }
    return data;
  }

  async updatePromoStatus(promo: Promo, save: boolean) {
    if (promo.redeemStatus != RedeemStatus.DEFERRED && promo.redeemStatus != RedeemStatus.AVAILABLE &&
      promo.redeemStatus != RedeemStatus.OPEN && promo.redeemStatus != RedeemStatus.NO_CARD) {
      // don't update status if in cancelled, in process of redemption, or expired
      return;
    }
    let startDateTime: DateTime = promo.getStartDateTime();
    let endDateTime: DateTime = promo.getEndDateTime();
    let currentDateTime: DateTime = DateTime.local();

    if (currentDateTime < startDateTime) {
      if (promo.redeemStatus != RedeemStatus.DEFERRED) {
        promo.redeemStatus = RedeemStatus.DEFERRED;
        if (save) {
          this.savePromo(promo);
        }
      }
    } else if (currentDateTime > endDateTime) {
      promo.redeemStatus = RedeemStatus.EXPIRED;
      if (save) {
        this.savePromo(promo);
      }
    } else {
      if (promo.redeemStatus != RedeemStatus.AVAILABLE) {
        promo.redeemStatus = RedeemStatus.AVAILABLE;
        if (save) {
          this.savePromo(promo);
        }
      }
    }
  }

  async updatePunchStatus(punch: PunchData, save: boolean) {
    if (punch.redeemStatus != RedeemStatus.DEFERRED && punch.redeemStatus != RedeemStatus.AVAILABLE &&
      punch.redeemStatus != RedeemStatus.OPEN && punch.redeemStatus != RedeemStatus.NO_CARD) {
      // don't update status if in cancelled, in process of redemption, or expired
      return;
    }
    let startDateTime: DateTime = punch.getStartDateTime();
    let endDateTime: DateTime = punch.getEndDateTime();
    let currentDateTime: DateTime = DateTime.local();

    if (currentDateTime < startDateTime) {
      if (punch.redeemStatus != RedeemStatus.DEFERRED) {
        punch.redeemStatus = RedeemStatus.DEFERRED;
        if (save) {
          // this.savePromo(promo);
        }
      }
    } else if (currentDateTime > endDateTime) {
      punch.redeemStatus = RedeemStatus.EXPIRED;
      if (save) {
        // this.savePromo(promo);
      }
    } else {
      if (punch.redeemStatus != RedeemStatus.AVAILABLE) {
        punch.redeemStatus = RedeemStatus.AVAILABLE;
        if (save) {
          // this.savePromo(promo);
        }
      }
    }
  }

  async updateEventStatus(event: EventWGuestData, save: boolean) {
    if (event.redeemStatus != RedeemStatus.DEFERRED && event.redeemStatus != RedeemStatus.AVAILABLE &&
      event.redeemStatus != RedeemStatus.OPEN && event.redeemStatus != RedeemStatus.NO_CARD) {
      // don't update status if in cancelled, in process of redemption, or expired
      return;
    }
    let startDateTime: DateTime = event.getStartDateTime();
    let endDateTime: DateTime = event.getEndDateTime();
    let currentDateTime: DateTime = DateTime.local();
    if (currentDateTime < startDateTime) {
      if (event.redeemStatus != RedeemStatus.DEFERRED) {
        event.redeemStatus = RedeemStatus.DEFERRED;
        if (save) {
          // this.saveEvent(event);
        }
      }
    } else if (currentDateTime > endDateTime) {
      event.redeemStatus = RedeemStatus.EXPIRED;
      if (save) {
        // this.saveEvent(event);
      }
    } else {
      if (event.redeemStatus != RedeemStatus.AVAILABLE) {
        event.redeemStatus = RedeemStatus.AVAILABLE;
        if (save) {
          // this.saveEvent(event);
        }
      }
    }
  }

  async updateSurveyStatus(survey: SurveyData, save: boolean) {
    if (survey.redeemStatus != RedeemStatus.DEFERRED && survey.redeemStatus != RedeemStatus.AVAILABLE &&
      survey.redeemStatus != RedeemStatus.OPEN && survey.redeemStatus != RedeemStatus.NO_CARD) {
      // don't update status if in cancelled, in process of redemption, or expired
      return;
    }
    let startDateTime: DateTime = survey.getStartDateTime();
    let endDateTime: DateTime = survey.getEndDateTime();
    let currentDateTime: DateTime = DateTime.local();
    if (currentDateTime < startDateTime) {
      if (survey.redeemStatus != RedeemStatus.DEFERRED) {
        survey.redeemStatus = RedeemStatus.DEFERRED;
        if (save) {
          // this.saveEvent(event);
        }
      }
    } else if (currentDateTime > endDateTime) {
      survey.redeemStatus = RedeemStatus.EXPIRED;
      if (save) {
        // this.saveEvent(event);
      }
    } else {
      if (survey.redeemStatus != RedeemStatus.AVAILABLE) {
        survey.redeemStatus = RedeemStatus.AVAILABLE;
        if (save) {
          // this.saveEvent(event);
        }
      }
    }
  }

  async updateFiveStarSurveyStatus(survey: FiveStarSurveyData, save: boolean) {
    if (survey.redeemStatus != RedeemStatus.DEFERRED && survey.redeemStatus != RedeemStatus.AVAILABLE &&
      survey.redeemStatus != RedeemStatus.OPEN && survey.redeemStatus != RedeemStatus.NO_CARD) {
      // don't update status if in cancelled, in process of redemption, or expired
      return;
    }
    let startDateTime: DateTime = survey.getStartDateTime();
    let endDateTime: DateTime = survey.getEndDateTime();
    let currentDateTime: DateTime = DateTime.local();
    if (currentDateTime < startDateTime) {
      if (survey.redeemStatus != RedeemStatus.DEFERRED) {
        survey.redeemStatus = RedeemStatus.DEFERRED;
        if (save) {
          // this.saveEvent(event);
        }
      }
    } else if (currentDateTime > endDateTime) {
      survey.redeemStatus = RedeemStatus.EXPIRED;
      if (save) {
        // this.saveEvent(event);
      }
    } else {
      if (survey.redeemStatus != RedeemStatus.AVAILABLE) {
        survey.redeemStatus = RedeemStatus.AVAILABLE;
        if (save) {
          // this.saveEvent(event);
        }
      }
    }
  }
  public generatePromo(fulfillment: Fulfillment, databaseID: string, promoQRData: string, promoType: PromoType): Promo {
    let siteString: string;
    let ffSite = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (ffSite != undefined) {
      siteString = ffSite.parts[0].value;
    }

    let locationString: string;
    let ffLocation = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffLocation != undefined) {
      locationString = ffLocation.parts[0].value;
    }

    let itemDescriptionString: string;
    let ffItemDescription = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');

    if (ffItemDescription != undefined) {
      itemDescriptionString = ffItemDescription.parts[0].value;
    }


    let priceString: string;
    // let ffPrice = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '$');
    // if (ffPrice != undefined) {
    //   priceString = ffPrice.parts[0].value;
    // }
    priceString = fulfillment.getPrice();

    let limitString: string;
    // let ffLimit = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'M');
    // if (ffLimit != undefined) {
    //   limitString = ffLimit.parts[0].value;
    // }
    limitString = fulfillment.getItemLimit();

    let redeemStatus: RedeemStatus = RedeemStatus.AVAILABLE;
    try {
      if(promoType == PromoType.DRWAING && fulfillment.isDrawing() && databaseID?.slice(0,1) == '2'){
        redeemStatus = RedeemStatus.ENTERED;
      }
    } catch (error) {
      redeemStatus = RedeemStatus.AVAILABLE;
    }
   

    // All engagment Types
    let startDateTime;
    let endDateTime;
    try {
      if (fulfillment.getEngageType() === EngageType.PROMOTION) {
        startDateTime = fulfillment.getPromoInterval().start.toISO();
        endDateTime = fulfillment.getPromoInterval().end.toISO();
      } else if (fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST){
        startDateTime = fulfillment.getEventInterval().start.toISO();
        endDateTime = fulfillment.getEventInterval().end.toISO();
      } else if (fulfillment.getEngageType() === EngageType.EVENT_REGISTRATION){
        startDateTime = fulfillment.getEventInterval().start.toISO();
        endDateTime = fulfillment.getEventInterval().end.toISO();
      } else if (fulfillment.getEngageType() === EngageType.SURVEY){
        startDateTime = fulfillment.getCampaignInterval().start;
        endDateTime = fulfillment.getCampaignInterval().end;
      } else if (fulfillment.getEngageType() === EngageType.FIVESTARSURVEY){
        startDateTime = fulfillment.getCampaignInterval().start;
        endDateTime = fulfillment.getCampaignInterval().end;
      } else if (fulfillment.getEngageType() === EngageType.PUNCH){
        let pCode = fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === '2'));
        if(pCode){
          startDateTime = FFPunchPropertiesParser.getPromoInterval(fulfillment.ffData).start.toISO();
          endDateTime = FFPunchPropertiesParser.getPromoInterval(fulfillment.ffData).end.toISO();
        } else {
          startDateTime = fulfillment.getPromoInterval().start.toISO();
          endDateTime = fulfillment.getPromoInterval().end.toISO();
        }
      } else{
        startDateTime = fulfillment.getPromoInterval().start.toISO();
        endDateTime = fulfillment.getPromoInterval().end.toISO();
      }
    } catch (error) {
      startDateTime = fulfillment.getCampaignInterval().start.toISO();
      endDateTime = fulfillment.getCampaignInterval().end.toISO();
    }

    let promo = new Promo(
      // this.generateID(Domain.PROMO),
      databaseID,
      fulfillment.databaseID,
      promoQRData,
      redeemStatus,
      null,
      fulfillment.getPromoDescription(),
      fulfillment.getOrg(),
      promoType,
      fulfillment.getPromoInterval().start.toISO(),
      fulfillment.getPromoInterval().end.toISO(),
      // startDateTime,
      // endDateTime,
      itemDescriptionString,
      priceString,
      limitString,
      siteString,
      locationString,
      Date.now()
    )
    promo.setParentCampaign(fulfillment);
    promo.redeemMethod = fulfillment.getRedeemMethod();
    console.log("0.Promo Redeem Method: " + promo.redeemMethod);
    if (promo.redeemMethod == RedeemMethod.QUICK) {
      promo.redeemMethodAllowed = true;
    } else if (promo.redeemMethod == RedeemMethod.SELF) {
      promo.redeemMethodAllowed = true;
    } else {
      promo.redeemMethodAllowed = false;
    }
    if (fulfillment.isPromoCampaignType()) {
      promo.redeemSource = RedeemSource.INCENTIVE;
    } else {
      promo.redeemSource = RedeemSource.OPT_IN;
    }
    promo.campaignDescription = fulfillment.getDescription();

    this.updatePromoStatus(promo, false);
    return promo;
  }

  public generatePunchForData(fulfillment: Fulfillment, databaseID: string, promoQRData: string, punchInfo: Punch): PunchData {
    let siteString: string;
    let ffSite = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (ffSite != undefined) {
      siteString = ffSite.parts[0].value;
    }

    let locationString: string;
    let ffLocation = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffLocation != undefined) {
      locationString = ffLocation.parts[0].value;
    }

    let itemDescriptionString: string;
    let ffItemDescription = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');

    if (ffItemDescription != undefined) {
      itemDescriptionString = ffItemDescription.parts[0].value;
    }

    let priceString: string;
    // let ffPrice = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '$');
    // if (ffPrice != undefined) {
    //   priceString = ffPrice.parts[0].value;
    // }
    priceString = fulfillment.getPrice();

    let limitString: string;
    // let ffLimit = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'M');
    // if (ffLimit != undefined) {
    //   limitString = ffLimit.parts[0].value;
    // }
    limitString = fulfillment.getItemLimit();

    let type:PromoType;
    const isDrawing: FFData = fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'));
    const isCoupon: FFData = fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'c'));

    if(isDrawing != null){
      type = PromoType.DRWAING
    }else if(isCoupon){
      type =  PromoType.COUPON
    }

    let startDateString: string;
    let endDateString: string;

    try {
      let relativeInterval: Interval
      let relData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0E');
      if(relData === undefined) {
        relData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0r');
      }
      if (relData) {
        let splitData: string[] = relData.parts[0].value.split(',');
        if (splitData.length != 2) {
          console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
        }
    
        let startString: string = splitData[0];
        let endString: string = splitData[1];
        let startDateTime: DateTime = DateTime.local().plus({ minutes: fulfillment.base64toNumber(startString) });
        let endDateTime: DateTime = startDateTime.plus({ minutes: fulfillment.base64toNumber(endString) });
        relativeInterval = {
          start: startDateTime,
          end: endDateTime
        }
      } else {
        let promoData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9F');
        if(promoData === undefined) {
          promoData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9r');
        }
        console.log("0.Promo Data: " + promoData);
        if(promoData)
          relativeInterval = fulfillment.getCrunchedIntervalFromFFData(promoData);
      }
      if(relativeInterval != null || relativeInterval != undefined){
        startDateString = relativeInterval.start.toISO();
        endDateString = relativeInterval.end.toISO();
      } else {
        startDateString = fulfillment.getCampaignInterval().start.toISO();
        endDateString = fulfillment.getCampaignInterval().end.toISO();
      }
      
    } catch (error) {
      startDateString = fulfillment.getCampaignInterval().start.toISO();
      endDateString = fulfillment.getCampaignInterval().end.toISO();
    }

    // console.log("startDateString-> ",startDateString);
    // console.log("endDateString-> ",endDateString);
    let punchData = new PunchData(
      // this.generateID(Domain.PROMO),
      databaseID,
      fulfillment.databaseID,
      promoQRData,
      RedeemStatus.AVAILABLE,
      null,
      fulfillment.getPromoDescription(),
      fulfillment.getOrg(),
      type,
      startDateString,
      endDateString,
      // fulfillment.getPromoInterval().start.toISO(),
      // fulfillment.getPromoInterval().end.toISO(),
      itemDescriptionString,
      priceString,
      limitString,
      siteString,
      locationString,
      Date.now()
    )
    punchData.setParentCampaign(fulfillment);
    punchData.redeemMethod = fulfillment.getRedeemMethod();
    if (punchData.redeemMethod == RedeemMethod.QUICK) {
      punchData.redeemMethodAllowed = true;
    } else if (punchData.redeemMethod == RedeemMethod.SELF) {
      punchData.redeemMethodAllowed = true;
    } else {
      punchData.redeemMethodAllowed = false;
    }
    if (fulfillment.isPromoCampaignType()) {
      punchData.redeemSource = RedeemSource.INCENTIVE;
    } else {
      punchData.redeemSource = RedeemSource.OPT_IN;
    }
    punchData.campaignDescription = fulfillment.getDescription();

    this.updatePunchStatus(punchData, false);

     // generate punch values
     let punch = new Punch();
     punch.campaignID = fulfillment.getCampaignID();
     if (fulfillment.isTrackerEmail()) {
       punch.deliveryMethod = DeliveryMethod.EMAIL;
       punch.destinationAddress = fulfillment.getTrackerEmail();
     } else if (fulfillment.isTrackerURL()) {
       punch.deliveryMethod = DeliveryMethod.REST;
       punch.destinationAddress = fulfillment.getTrackerURL();
     } else {
       console.log("Could not identify fulfillment delivery type during punch generation");
     }
 
     punch.punchType = FFPunchPropertiesParser.getPunchType(fulfillment.ffData);
     punch.starterPunches = FFPunchPropertiesParser.getPunchesStarter(fulfillment.ffData);
     punch.cardLimit = FFPunchPropertiesParser.getMaxPunchCards(fulfillment.ffData);
     punch.punchesRequired = FFPunchPropertiesParser.getPunchesNeeded(fulfillment.ffData);
     if(punchInfo != null)
        punch.punchCount = punchInfo.punchCount != null ? punchInfo.punchCount : 0;
    //  if (applyStarter) {
    //    punch.punchCount = punch.starterPunches;
    //  }
 
     punchData.punch = punch;
    return punchData;
  }

  public generateEventWithGuest(fulfillment: Fulfillment, databaseID: string, promoQRData: string): EventWGuestData {
    let siteString: string;
    let ffSite = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (ffSite != undefined) {
      siteString = ffSite.parts[0].value;
    }

    let locationString: string;
    let ffLocation = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffLocation != undefined) {
      locationString = ffLocation.parts[0].value;
    }

    let itemDescriptionString: string;
    let ffItemDescription = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');

    if (ffItemDescription != undefined) {
      itemDescriptionString = ffItemDescription.parts[0].value;
    }


    let priceString: string;
    // let ffPrice = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '$');
    // if (ffPrice != undefined) {
    //   priceString = ffPrice.parts[0].value;
    // }
    priceString = fulfillment.getPrice();

    let limitString: string;
    let guestLimit: number;
    let guestSelected: number;
    limitString = fulfillment.getItemLimit();
    if (fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST){
      guestLimit = fulfillment.getMaxGuests()
      guestSelected = fulfillment.getGuests()
    }

    let bonusType: BonusType = fulfillment.getBonusTypeInfo();

    let event = new EventWGuestData(
      // this.generateID(Domain.PROMO),
      databaseID,
      fulfillment.databaseID,
      promoQRData,
      RedeemStatus.AVAILABLE,
      null,
      fulfillment.getPromoDescription(),
      fulfillment.getOrg(),
      bonusType,
      fulfillment.getEventInterval().start.toISO(),
      fulfillment.getEventInterval().end.toISO(),
      itemDescriptionString,
      priceString,
      limitString,
      siteString,
      locationString,
      guestLimit,
      guestSelected,
      fulfillment.getIncentOrg(),
      fulfillment.getIncentiveDescription(),
      Date.now()
    )
    event.setParentCampaign(fulfillment);
    event.redeemMethod = fulfillment.getRedeemMethod();
    if (event.redeemMethod == RedeemMethod.QUICK) {
      event.redeemMethodAllowed = true;
    } else if (event.redeemMethod == RedeemMethod.SELF) {
      event.redeemMethodAllowed = true;
    } else {
      event.redeemMethodAllowed = false;
    }
    if (fulfillment.isPromoCampaignType()) {
      event.redeemSource = RedeemSource.INCENTIVE;
    } else {
      event.redeemSource = RedeemSource.OPT_IN;
    }
    event.campaignDescription = fulfillment.getDescription();

    this.updateEventStatus(event, false);
    return event;
  }

  public generateSurvey(fulfillment: Fulfillment, databaseID: string, promoQRData: string): SurveyData {
    let siteString: string;
    let ffSite = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (ffSite != undefined) {
      siteString = ffSite.parts[0].value;
    }

    let locationString: string;
    let ffLocation = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffLocation != undefined) {
      locationString = ffLocation.parts[0].value;
    }

    let itemDescriptionString: string;
    let ffItemDescription = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');

    if (ffItemDescription != undefined) {
      itemDescriptionString = ffItemDescription.parts[0].value;
    }


    let priceString: string;
    // let ffPrice = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '$');
    // if (ffPrice != undefined) {
    //   priceString = ffPrice.parts[0].value;
    // }
    priceString = fulfillment.getPrice();

    let limitString: string;
    limitString = fulfillment.getItemLimit();

    let bonusType: BonusType = fulfillment.getBonusTypeInfo();

    let survey = new SurveyData(
      // this.generateID(Domain.PROMO),
      databaseID,
      fulfillment.databaseID,
      promoQRData,
      RedeemStatus.AVAILABLE,
      null,
      fulfillment.getPromoDescription(),
      fulfillment.getOrg(),
      bonusType,
      fulfillment.getCampaignInterval().start,
      fulfillment.getCampaignInterval().end,
      itemDescriptionString,
      priceString,
      limitString,
      siteString,
      locationString,
      fulfillment.getIncentOrg(),
      fulfillment.getIncentiveDescription(),
      fulfillment.getSurveyQuestion(),
      Date.now()
    )
    survey.setParentCampaign(fulfillment);
    survey.redeemMethod = fulfillment.getRedeemMethod();
    if (survey.redeemMethod == RedeemMethod.QUICK) {
      survey.redeemMethodAllowed = true;
    } else if (survey.redeemMethod == RedeemMethod.SELF) {
      survey.redeemMethodAllowed = true;
    } else {
      survey.redeemMethodAllowed = false;
    }
    if (fulfillment.isPromoCampaignType()) {
      survey.redeemSource = RedeemSource.INCENTIVE;
    } else {
      survey.redeemSource = RedeemSource.OPT_IN;
    }
    survey.campaignDescription = fulfillment.getDescription();

    this.updateSurveyStatus(survey, false);
    return survey;
  }

  public generateFiveStarSurvey(fulfillment: Fulfillment, databaseID: string, promoQRData: string): FiveStarSurveyData {
    let siteString: string;
    let ffSite = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (ffSite != undefined) {
      siteString = ffSite.parts[0].value;
    }

    let locationString: string;
    let ffLocation = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffLocation != undefined) {
      locationString = ffLocation.parts[0].value;
    }

    let itemDescriptionString: string;
    let ffItemDescription = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');

    if (ffItemDescription != undefined) {
      itemDescriptionString = ffItemDescription.parts[0].value;
    }


    let priceString: string;
    // let ffPrice = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '$');
    // if (ffPrice != undefined) {
    //   priceString = ffPrice.parts[0].value;
    // }
    priceString = fulfillment.getPrice();

    let limitString: string;
    limitString = fulfillment.getItemLimit();

    let bonusType: BonusType = fulfillment.getBonusTypeInfo();

    let fiveStarSurvey = new FiveStarSurveyData(
      // this.generateID(Domain.PROMO),
      databaseID,
      fulfillment.databaseID,
      promoQRData,
      RedeemStatus.AVAILABLE,
      null,
      fulfillment.getPromoDescription(),
      fulfillment.getOrg(),
      bonusType,
      fulfillment.getCampaignInterval().start,
      fulfillment.getCampaignInterval().end,
      itemDescriptionString,
      priceString,
      limitString,
      siteString,
      locationString,
      fulfillment.getIncentOrg(),
      fulfillment.getIncentiveDescription(),
      fulfillment.getSurveyQuestion(),
      Date.now()
    )
    fiveStarSurvey.setParentCampaign(fulfillment);
    fiveStarSurvey.redeemMethod = fulfillment.getRedeemMethod();
    console.log("fiveStarSurvey.redeemMethod: " + fiveStarSurvey.redeemMethod);
    if (fiveStarSurvey.redeemMethod == RedeemMethod.QUICK) {
      fiveStarSurvey.redeemMethodAllowed = true;
    } else if (fiveStarSurvey.redeemMethod == RedeemMethod.SELF) {
      fiveStarSurvey.redeemMethodAllowed = true;
    } else {
      fiveStarSurvey.redeemMethodAllowed = false;
    }
    if (fulfillment.isPromoCampaignType()) {
      fiveStarSurvey.redeemSource = RedeemSource.INCENTIVE;
    } else {
      fiveStarSurvey.redeemSource = RedeemSource.OPT_IN;
    }
    fiveStarSurvey.campaignDescription = fulfillment.getDescription();

    this.updateFiveStarSurveyStatus(fiveStarSurvey, false);
    return fiveStarSurvey;
  }

  public generatePunchIncentive(punchPromo: Promo, databaseID: string, promoQRData: string, promoType: PromoType, ffData: FFData[]): Promo {
    let rewardSite = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'j');
    let rewardSiteString: string;
    if (!!rewardSite) {
      rewardSiteString = rewardSite.parts[0].value;
    } else {
      rewardSiteString = punchPromo.site;
    }

    let rewardLocation = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'k');
    let rewardLocationString: string;
    if (!!rewardLocation) {
      rewardLocationString = rewardLocation.parts[0].value;
    } else {
      rewardLocationString = punchPromo.location;
    }

    let itemDescriptionString: string = punchPromo.itemDescription;


    let priceString: string = punchPromo.price;

    let limitString: string = punchPromo.limit;

    let redeemInterval: Interval = FFPunchPropertiesParser.getPromoInterval(ffData);

    let promo = new Promo(
      // this.generateID(Domain.PROMO),
      databaseID,
      punchPromo.parentID,
      promoQRData,
      RedeemStatus.AVAILABLE,
      null,
      punchPromo.description,
      punchPromo.org,
      promoType,
      redeemInterval.start.toISO(),
      redeemInterval.end.toISO(),
      itemDescriptionString,
      priceString,
      limitString,
      rewardSiteString,
      rewardLocationString,
      Date.now()
    )
    promo.redeemMethod = punchPromo.redeemMethod;
    if (promo.redeemMethod == RedeemMethod.QUICK) {
      promo.redeemMethodAllowed = true;
    } else if (promo.redeemMethod == RedeemMethod.SELF) {
      promo.redeemMethodAllowed = true;
    } else {
      promo.redeemMethodAllowed = false;
    }
    promo.redeemSource = punchPromo.redeemSource;
    promo.campaignDescription = punchPromo.campaignDescription;

    this.updatePromoStatus(promo, false);
    return promo;
  }

  public generatePunch(fulfillment: Fulfillment, promoQRData: string, parentID: string, applyStarter: boolean, parentFF: Fulfillment): Promo {
    // promo values
      let siteString: string;
      let locationString: string;
      let itemDescriptionString: string;
      let priceString: string;
      let limitString: string;
      let promoDescription: string;
      let org: string;
      let punchesNeededFF: FFData[];
      let campDesc: string;
      if (fulfillment.getEngageType() != EngageType.PUNCH && parentFF) {
        let ffSite = parentFF.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
        if (ffSite != undefined) {
          siteString = ffSite.parts[0].value;
        }
        
        let ffLocation = parentFF.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
        if (ffLocation != undefined) {
          locationString = ffLocation.parts[0].value;
        }
    
        let ffItemDescription = parentFF.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');
        if (ffItemDescription != undefined) {
          itemDescriptionString = ffItemDescription.parts[0].value;
        }
        priceString = parentFF?.getPrice();
        limitString = parentFF?.getItemLimit();
        promoDescription = parentFF?.getPromoDescription();
        org = parentFF?.getOrg();
        punchesNeededFF = parentFF?.ffData;
        campDesc = parentFF?.getDescription(); 
      } else {

        let ffSite = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
        if (ffSite != undefined) {
          siteString = ffSite.parts[0].value;
        }

        let ffLocation = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
        if (ffLocation != undefined) {
          locationString = ffLocation.parts[0].value;
        }

        let ffItemDescription = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'I');
        if (ffItemDescription != undefined) {
          itemDescriptionString = ffItemDescription.parts[0].value;
        }

        priceString = fulfillment.getPrice();
        limitString = fulfillment.getItemLimit();
        promoDescription = fulfillment.getPromoDescription();
        org = fulfillment.getOrg();
        punchesNeededFF = fulfillment.ffData;
        campDesc = fulfillment.getDescription(); 
      }


    let punchInterval: Interval;
    if(fulfillment.getEngageType() != EngageType.PUNCH && parentFF){
      try {
        punchInterval= parentFF.getPunchDate();
      } catch (error) {
        punchInterval= fulfillment.getCampaignInterval();
      }
    }else{
      try {
        let relativeInterval: Interval
        let relData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0E');
        if(relData === undefined) {
          relData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0r');
        }
        if (relData) {
          let splitData: string[] = relData.parts[0].value.split(',');
          if (splitData.length != 2) {
            console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
          }
      
          let startString: string = splitData[0];
          let endString: string = splitData[1];
          let startDateTime: DateTime = DateTime.local().plus({ minutes: fulfillment.base64toNumber(startString) });
          let endDateTime: DateTime = startDateTime.plus({ minutes: fulfillment.base64toNumber(endString) });
          relativeInterval = {
            start: startDateTime,
            end: endDateTime
          }
        } else {
          let promoData = fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9F');
          console.log("1.Promo Data: " + promoData);
          if(promoData)
            relativeInterval = fulfillment.getCrunchedIntervalFromFFData(promoData);
        }
        if(relativeInterval != null || relativeInterval != undefined){
          punchInterval = relativeInterval;
        } else {
          punchInterval= fulfillment.getCampaignInterval();
        }
        
      } catch (error) {
        punchInterval= fulfillment.getCampaignInterval();
      }
    }

    let promo = new Promo(
      // this.generateID(Domain.PROMO),
      this.generateID(Domain.PROMO),
      parentID === null ? null : parentID,
      promoQRData,
      RedeemStatus.AVAILABLE,
      null,
      promoDescription,
      org,
      // FFPunchPropertiesParser.getPunchIncentiveDescription(fulfillment.ffData),
      // FFPunchPropertiesParser.getPunchSponsor(fulfillment.ffData),
      PromoType.PUNCH,
      // FFPunchPropertiesParser.getPromoInterval(fulfillment.ffData).start.toISO(),
      // FFPunchPropertiesParser.getPromoInterval(fulfillment.ffData).end.toISO(),
      punchInterval.start.toISO(),
      punchInterval.end.toISO(),
      itemDescriptionString,
      priceString,
      limitString,
      siteString,
      locationString,
      Date.now()
    )

    promo.redeemMethod = FFPunchPropertiesParser.getRedeemMethod(fulfillment.ffData);
    if (promo.redeemMethod == RedeemMethod.QUICK) {
      promo.redeemMethodAllowed = true;
    } else if (promo.redeemMethod == RedeemMethod.SELF) {
      promo.redeemMethodAllowed = true;
    } else {
      promo.redeemMethodAllowed = false;
    }
    if (fulfillment.isPromoCampaignType()) {
      promo.redeemSource = RedeemSource.INCENTIVE;
    } else {
      promo.redeemSource = RedeemSource.OPT_IN;
    }
    promo.campaignDescription = campDesc;

    this.updatePromoStatus(promo, false);

    // generate punch values
    let punch = new Punch();
    punch.campaignID = fulfillment.getCampaignID();
    if (fulfillment.isTrackerEmail()) {
      punch.deliveryMethod = DeliveryMethod.EMAIL;
      punch.destinationAddress = fulfillment.getTrackerEmail();
    } else if (fulfillment.isTrackerURL()) {
      punch.deliveryMethod = DeliveryMethod.REST;
      punch.destinationAddress = fulfillment.getTrackerURL();
    } else {
      console.log("Could not identify fulfillment delivery type during punch generation");
    }

    punch.punchType = FFPunchPropertiesParser.getPunchType(fulfillment.ffData);
    punch.starterPunches = FFPunchPropertiesParser.getPunchesStarter(fulfillment.ffData);
    punch.cardLimit = FFPunchPropertiesParser.getMaxPunchCards(fulfillment.ffData);
    punch.punchesRequired = FFPunchPropertiesParser.getPunchesNeeded(punchesNeededFF);
    punch.actionText = FFPunchPropertiesParser.getActionText(punchesNeededFF);
    if (applyStarter) {
      punch.punchCount = punch.starterPunches;
    } else {
      if(parentID == null) {
        punch.punchCount = 1;
      }
    }

    promo.punch = punch;

    return promo;
  }

  async saveSymbolValues(symbol: Symbol<any>) {
    let dbObj = {
      parts: [], //code: __, value: __
      composites: [] //code: __, alert: __
    };

    if (!!symbol.parts) {
      symbol.parts
        .filter(part => part.value !== undefined)
        .forEach(part => {
          dbObj.parts.push({
            code: part.code,
            value: part.value
          });
        });
    }

    if (!!symbol.composites) {
      symbol.composites
        .filter(composite => composite.alert !== undefined)
        .forEach(composite => {
          dbObj.composites.push({
            code: composite.code,
            alert: composite.alert
          });
        });
    }

    await this.storage.set(symbol.databaseID, dbObj);
  }

  async loadSymbolValues<T>(symbol: Symbol<T>): Promise<Symbol<T>> {
    let dbObj = await this.storage.get(symbol.databaseID);

    //empty any values in Symbol
    if (!!symbol.parts) {
      symbol.parts.forEach(part => part.value = null);
    } else {
      symbol.parts = [];
    }
    if (!!symbol.composites) {
      symbol.composites.forEach(composite => composite.alert = true);
    } else {
      symbol.composites = [];
    }

    //load new values
    if (!!dbObj) {
      dbObj.parts.forEach(dbPart => {
        symbol.parts.find(part => part.code === dbPart.code).value = dbPart.value;
      });
      dbObj.composites.forEach(dbComp => {
        symbol.composites.find(comp => comp.code === dbComp.code).alert = !(dbComp.alert === false);
      });
    }
    return symbol;
  }

  async saveFF(ff: Fulfillment) {
    let dbObj = {
      databaseID: ff.databaseID,
      promoIDs: ff.promoIDs,
      promoInterval: ff.getPromoInterval(),
      updateState: ff.getUpdateState(),
      // cancelState: ff.getCancelState(),
      canceled: ff.isCanceled(),
      qrData: ff.qrData,
      scanTime: ff.scanTime,
      deviceID: ff.deviceID,
      processedTime: ff.processedTime,
      state: ff.state,
      tasks: [],
      ffData: ff.ffData,
      isDummy: ff.isDummy
    }

    if (ff.getPunchID()) {
      dbObj['punchID'] = ff.getPunchID();
    }

    if (ff.getGuests()) {
      dbObj['guests'] = ff.getGuests();
    }

    if (!!ff.tasks) {
      ff.tasks.forEach(task => {
        let dbTask: any = {
          type: task.type,
          status: task.status
        }

        switch (task.type) {
          case TaskType.REST_POST:
            dbTask.url = (task as RestPostTask).url;
            break;
          case TaskType.EMAIL:
            dbTask.emailAddr = (task as EmailTask).emailAddr;
            break;
          case TaskType.GENERATE_PROMO:
            dbTask.promoType = (task as PromoGenTask).promoType;
            dbTask.promoQRData = (task as PromoGenTask).promoQRData;
            break;
        }

        dbObj.tasks.push(dbTask);
      });
    }

    await this.storage.set(dbObj.databaseID, dbObj);
  }

  async loadFFs(): Promise<Fulfillment[]> {
    let ffs: Fulfillment[] = [];
    for (let key of await this.storage.keys()) {
      if (key.startsWith(Domain.FULFILLMENT.toString())) {
        ffs.push(await this.loadFF(key));
      }
    }
    return ffs;
  }

  async loadFF(databaseID: string): Promise<Fulfillment> {
    let dbObj = await this.storage.get(databaseID);
    if (!dbObj) return null;

    let tasks: Task[] = [];
    if (!!dbObj.tasks) {
      tasks = dbObj.tasks.map((t: any) => {
        switch (t.type) {
          case TaskType.EMAIL:
            return new EmailTask(t.emailAddr, t.status);
          case TaskType.GENERATE_PROMO:
            return new PromoGenTask(t.promoType, t.databaseID, t.promoQRData, t.status);
          case TaskType.REST_POST:
            return new RestPostTask(t.url, t.status);
          default:
            console.error('unable to parse this task type:' + t.type);
            return null;
        }
      });
    }

    let fulfillmentFromStorage = JSON.parse(JSON.stringify(dbObj)) as Fulfillment;
    let ret = new Fulfillment(null, null, null, null, null);
    Object.assign(ret, fulfillmentFromStorage);

    return ret;
    // return new Fulfillment(
    //   dbObj.databaseID,
    //   dbObj.qrData,
    //   dbObj.scanTime,
    //   dbObj.deviceID,
    //   dbObj.state,
    //   dbObj.processedTime,
    //   tasks,
    //   ffData
    // );
  }

  async deleteFFandChildren(ff: Fulfillment): Promise<void> {
    if (ff.promoIDs.length > 0) {
      ff.promoIDs.forEach(async promoID => {
        await this.delete(promoID);
      });
    }
    if (ff.getPunchID()) {
      await this.delete(ff.getPunchID());
    }
    await this.delete(ff.databaseID);
  }

  async setFFandChildrenCanceledState(ff: Fulfillment, canceled: boolean): Promise<void> {
    if (ff.promoIDs.length > 0) {
      ff.promoIDs.forEach(async promoID => {
        let promo: Promo = await this.loadPromo(promoID);
        promo.setCanceled(canceled);
        await this.savePromo(promo);
      });
    }
    if (ff.getPunchID()) {
      let promoPunch: Promo = await this.loadPromo(ff.getPunchID());
      promoPunch.setCanceled(canceled);
      await this.savePromo(promoPunch);
    }
    ff.setCanceled(canceled);
    await this.saveFF(ff);
  }

  async delete(databaseID: string): Promise<void> {
    await this.storage.remove(databaseID);
  }

  // for development only
  async clearData(): Promise<void> {
    await this.storage.clear();
  }

  //DUMP
  async dumpDB(): Promise<string> {

    let data: any = {};
    data.elements = [];
    data.version = ModelService.version;

    for (let key of await this.storage.keys()) {
      let ele: any = await this.storage.get(key);
      data.elements.push({ id: key, o: ele });
    }
    return JSON.stringify(data);
  }

  //LOAD
  async loadDB(dbStr: string) {
    await this.storage.clear();
    let obj = JSON.parse(dbStr);
    obj.elements.forEach(async o => await this.storage.set(o.id, o.o));
  }

  async printDB(): Promise<any[]> {
    let data: any[] = [];
    for (let key of await this.storage.keys()) {
      let ele: any = await this.storage.get(key);
      data.push(ele);
    }
    return data;
  }

}
