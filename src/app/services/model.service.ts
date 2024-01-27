import { Injectable } from '@angular/core';

import { DateTime,Settings } from 'luxon';
import { BehaviorSubject } from 'rxjs';
import { Storage } from '@ionic/storage';

//
//  SYMBOLOGY
//
// If you get the error: export Symbol was not found int model.service.ts
// It seems to work if you separate the import
// For example:
// Before:
// import { FFData, Fulfillment, SymbolType, Symbol, Composite, FFAction, FFState, InputSymbol, ModelService, Interval, PromoType } from 'src/app/services/model.service';
// After:
// import { FFData, Fulfillment, SymbolType, Composite, FFAction, FFState, InputSymbol, ModelService, Interval, PromoType } from 'src/app/services/model.service';
// import { Symbol } from 'src/app/services/model.service';
export interface Symbol<T> extends Persistant {
  type: SymbolType,
  code: string,
  text: string,
  parts?: Part[],
  composites?: Composite[],
}

export interface Composite {
  code: string,
  text?: string,
  jsonKey?: string,
  partCodes?: string[],
  alert?: boolean,      //db
}

export interface Part {
  code: string,
  jsonKey: string,
  text?: string,
  value?: any,          //db
}

export enum SymbolType {
  QRCode,
  Action,
  ActionOption,
  User,
  Programmatic
}

export enum EngageType {
  EVENT_REGISTRATION = "Event",
  EVENT_WITH_GUEST = "Event w/ Guests",
  PROMOTION = "Promo",
  SURVEY = "Survey",
  FIVESTARSURVEY = "5 Star Survey",
  PUNCH = "Punch"
}

//
//  SCAN
//
export interface InputSymbol<T> extends Symbol<T> {
  parts?: InputPart[],
  composites?: InputComposite[]
}

export interface InputPart extends Part {
  missing?: boolean,
  skip?: boolean,
}

export interface InputComposite extends Composite {
  required?: boolean,
  value?: string,
}

//
// FULFILLMENT
//
export interface FFData {
  type: SymbolType,
  code: string,
  parts?: { //input
    code: string,
    value: string
  }[],
  composites?: { //output
    code: string,
    required: boolean,
    skip?: boolean,
    value?: string
  }[]
}

export enum FFState {
  OPT_IN = "Opt-In",
  SUBMITTED = 'Submitted',
  PENDING = 'Pending',
  REGISTERED = 'Registered',
  DELETED = 'Deleted',
  // CANCELED = 'Canceled',
  AT_LIMIT = 'At Limit'
}

export enum UpdateState {
  NONE = "None",
  SUBMITTED = "Submitted",
  APPROVED = "Approved",
  DENIED = "Denied"
}

export enum CancelState {
  NONE = "None",
  SUBMITTED = "Submitted",
  APPROVED = "Approved",
  DENIED = "Denied"
}

export enum FFAction {
  REGISTER,
  UPDATE,
  REDEEM,
  DELETE,
  CANCEL,
  ACTIONABLE,
  LOST,
  PUNCH_CHECK_IN,
  PUNCH_REWARD,
  PUNCH_ORPHAN,
  REOPEN
}

export enum RedeemMethod {
  NONE = 'None',
  SELF = 'Self Redeem',
  TRACKER = 'Tracker Redeem',
  QUICK = 'Quick Redeem'
}

export interface Interval {
  start?: DateTime,
  end?: DateTime
}

export interface Relative {
  days: number,
  hours: number,
  minutes: number
}

export class Fulfillment implements Persistant {

  //transient
  public ffAction: FFAction;
  private campaignID: string;
  private engageType: EngageType;
  private promoType: PromoType;

  public statusSubject: BehaviorSubject<TaskStatus> = new BehaviorSubject<TaskStatus>(TaskStatus.IN_PROGRESS);

  private scanLocation;
  private org: string;
  private desc: string;
  private eventInterval: Interval;
  private campInterval: Interval;
  private site: string;
  private location: string;
  private promoInterval: Interval;
  private promoDescription: string;
  private _promoIDs: string[] = [];
  private bonusType:string;
  private punchType:string;


  private punchID: string;

  private surveyOptions: string[];
  private remoteClockMode: boolean;
  private updateState: UpdateState = UpdateState.NONE;
  private cancelState: CancelState = CancelState.NONE;
  private canceled: boolean;
  private redeemMethod: RedeemMethod;
  private guests: number;
  private storage: Storage

  // set to true for placeholder campaign that should not show up in history view
  private _isDummy: boolean = false;

  // transient
  private actionResponse: string;

  constructor(
    public databaseID: string,
    public qrData: string,
    public scanTime: string, //utc iso string
    public deviceID: string,
    public state: FFState,
    public processedTime?: number,
    public tasks?: Task[],
    public ffData?: FFData[], //see fulfillment.service.initializeFFData()
  ) {
  }

  public getUserFacingState(): FFState {
    console.log("FF State: " + this.state)
    switch (this.state) {
      case FFState.OPT_IN:
        return FFState.OPT_IN;
      case FFState.SUBMITTED:
        return FFState.SUBMITTED;
      case FFState.REGISTERED:
        return FFState.REGISTERED;
      // case FFState.CANCELED:
      //   return FFState.CANCELED;
      case FFState.PENDING:
        return FFState.PENDING;
      case FFState.AT_LIMIT:
        return FFState.AT_LIMIT;
      default:
        return FFState.SUBMITTED;
    }
  }

  public getUpdateState(): UpdateState {
    return this.updateState;
  }

  public setUpdateState(updateState: UpdateState) {
    this.updateState = updateState;
  }

  public getCancelState(): CancelState {
    return this.cancelState;
  }

  public setCancelState(cancelState: CancelState) {
    this.cancelState = cancelState;
  }

  public isCanceled(): boolean {
    return this.canceled;
  }

  public setCanceled(canceled: boolean) {
    this.canceled = canceled; 
  }

  // requires FFData
  public getScanLocation() {
    if (!!this.scanLocation) return this.scanLocation;

    const scanLocString: string = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'L').parts[0].value;    

    if (!scanLocString || scanLocString.length != 7) {
      console.log("Unexpected length for scanLocString: " + scanLocString + " Length should be exactly 7");
      return null;
    };

    let campusId: string = this.base64toNumber(scanLocString.substring(0, 2)).toString();
    let siteId: string = this.base64toNumber(scanLocString.substring(2, 4)).toString();
    let locationId: string = this.base64toNumber(scanLocString.substring(4, 6)).toString();
    let mediaType: string = scanLocString.substring(6, 7);

    this.scanLocation = {campusId, siteId, locationId, mediaType};
    return this.scanLocation;
  }

  public getGuests(): number {
    return this.guests;
  }

  public setGuests(guests: number) {
    this.guests = guests;
  }

  public getRedeemMethod(): RedeemMethod {
    if (!!this.redeemMethod) return this.redeemMethod;

    const redeemData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && (d.code === '7' || d.code === 't'));
    if (!redeemData) return this.redeemMethod;

    let value = redeemData.parts[0].value;
    if (value === 'S') {
      this.redeemMethod = RedeemMethod.SELF;
    } else if (value === 'T') {
      this.redeemMethod = RedeemMethod.TRACKER;
    } else if (value === 'Q') {
      this.redeemMethod = RedeemMethod.QUICK;
    } else {
      console.log("Unexpected value for redeem method: " + value);
      this.redeemMethod = RedeemMethod.NONE;
    }

    return this.redeemMethod;
  }

  public get promoIDs(): string[] {
    return this._promoIDs;
  }
  public set promoIDs(value: string[]) {
    this._promoIDs = value;
  }

  //requires ffData
  public getDescription(): string {
    if (!!this.desc) return this.desc;
    const descData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'D');
    this.desc = descData ? descData.parts[0].value : '';
    return this.desc;
  }

  //requires ffData
  public getPromoDescription(): string {
    if (!!this.promoDescription) return this.promoDescription;
    const promoDescData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'd');
    this.promoDescription = promoDescData ? promoDescData.parts[0].value : '';
    return this.promoDescription;
  }

  getPunchTypeText(): string{
    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'A' || d.code === 'P' || d.code === 'K'));
    if(!!data){
      if(data.code === 'K' ){
        return 'Purchase ePunch Card';
      }else if(data.code === 'P'){
        return 'Check-in ePunch Card';
      }else if(data.code === 'A'){
        return 'ePunch Card';
      }
    }
    return 'ePunch Card';
  }

  public getBonusType(): string {
    // if (!!this.bonusType) return this.bonusType;
    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'|| d.code === 'c' 
    || d.code === 'A' || d.code === 'P' || d.code === 'K'));

    if(!!data){
      if(data.code === 'd' ){
        this.bonusType = BonusType.DRWAING
      }else if(data.code === 'c'){
        this.bonusType = BonusType.COUPON
      }else if(data.code === 'A' || data.code==='P' || data.code==='K'){
        this.bonusType = BonusType.PUNCH
      }
    }
    return this.bonusType;
  }

  public getBonusTypeInfo(): BonusType {
    // if (!!this.bonusType) return this.bonusType;
    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'|| d.code === 'c' 
    || d.code === 'A' || d.code === 'P' || d.code === 'K'));

    if(!!data){
      if(data.code === 'd' ){
        return BonusType.DRWAING
      }else if(data.code === 'c'){
        return BonusType.COUPON
      }else if(data.code === 'A' || data.code==='P' || data.code==='K'){
        return BonusType.PUNCH
      }
    }
    return null;
  }

  public getIncentTypeForNoCard(): BonusType {
    // if (!!this.bonusType) return this.bonusType;
    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'|| d.code === 'c'));

    if(!!data){
      if(data.code === 'd' ){
        return BonusType.DRWAING
      }else if(data.code === 'c'){
        return BonusType.COUPON
      }
    }
    return null;
  }

  public getIncentLabelForNoCard(): string {
    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'|| d.code === 'c'));

    if(!!data){
      if(data.code === 'd' ){
        return "Win! - "
      }else if(data.code === 'c'){
        return "Claim - "
      }
    }
    return '';
  }

  public getIncentLabel(): string {
    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'|| d.code === 'c' 
    || d.code === 'A' || d.code === 'P' || d.code === 'K'));

    if(!!data){
      if(data.code === 'd' ){
        return "Win! - "
      }else if(data.code === 'c'){
        return "Claim - "
      }else if(data.code === 'A' || data.code==='P' || data.code==='K'){
        return "Earn - "
      }
    }
    return '';
  }

  public getPunchID(): string {
    return this.punchID;
  }

  public setPunchID(punchID: string) {
    this.punchID = punchID;
  }

  //requires ffData
  public getCampaignID(): string {
    if (!!this.campaignID) return this.campaignID;
    const campData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'C');
    this.campaignID = campData ? campData.parts[0].value : '';
    return this.campaignID;
  }

  //requires ffData
  public getOrg(): string {
    if (!!this.org) return this.org;
    const sponsorData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'S');
    const providerData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'P');
    this.org = sponsorData ? sponsorData.parts[0].value : providerData ? providerData.parts[0].value : null;
    return this.org;
  }

  public getIncentOrg(): string {
    let ffVal = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 's');
    if (ffVal == null) return null;
    return ffVal.parts[0].value;
  }

  public getLocation(): string {
    let ffVal = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffVal == null) return null;
    this.location = ffVal.parts[0].value
    return ffVal.parts[0].value;
  }

  public getCustomLocation(): string {
    let ffVal = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (ffVal == null) return null;
    this.location = ffVal.parts[0].value
    let originalLocation: String = this.location;
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return null;
  }

  //requires ffData
  public getRemoteClockMode(): boolean {
    if (this.remoteClockMode !== null && this.remoteClockMode !== undefined) return this.remoteClockMode;
    let remoteClockData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'K');
    this.remoteClockMode = !!remoteClockData;
    return this.remoteClockMode;
  }

  //requires ffData
  public getEventInterval(): Interval {
    // if (!!this.eventInterval) return this.eventInterval;

    // let eventStartData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '2S');
    // let eventEndData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '2E');

    // this.eventInterval = this.getIntervalFromFFData(eventStartData, eventEndData);
    // return this.eventInterval;
    if (!!this.eventInterval) return this.eventInterval;
    let eventData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9E');
    this.eventInterval = this.getCrunchedIntervalFromFFData(eventData);
    return this.eventInterval;
  }

  //requires ffData
  public getFormattedEventStart(): string {
    return this.formatDateTime(this.getEventInterval().start);
  }

  //requires ffData
  public getFormattedEventEnd(): string {
    return this.formatDateTime(this.getEventInterval().end);
  }

  private formatDateTime(dateTime: DateTime) {
    if (!dateTime) return null;
    return dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  //requires ffData
  public getCampaignInterval(): Interval {
    // if (!!this.campInterval) return this.campInterval;

    // let campStartData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '1S');
    // let campEndData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '1E');

    // this.campInterval = this.getIntervalFromFFData(campStartData, campEndData);
    // return this.campInterval;
    if (!!this.campInterval) return this.campInterval;
    let campData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9C');
    this.campInterval = this.getCrunchedIntervalFromFFData(campData);
    return this.campInterval;
  }

  //requires ffData
  public getFormattedCampaignStart(): string {
    return this.formatDateTime(this.getCampaignInterval().start);
  }

  //requires ffData
  public getFormattedCampaignEnd(): string {
    return this.formatDateTime(this.getCampaignInterval().end);
  }

  public getPromoIntervalNew(): Interval {
    return this.initializePromoInterval1();
  }

  private initializePromoInterval1(): Interval {
    let relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0E');
    if(relData === undefined) {
      relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0r');
    }
    if (relData) {
      let splitData: string[] = relData.parts[0].value.split(',');
      if (splitData.length != 2) {
        console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
      }
  
      let startString: string = splitData[0];
      let endString: string = splitData[1];
      let startDateTime: DateTime = DateTime.local().plus({ minutes: this.base64toNumber(startString) });
      let endDateTime: DateTime = startDateTime.plus({ minutes: this.base64toNumber(endString) });
      let relativeInterval: Interval = {
        start: startDateTime,
        end: endDateTime
      }
      return relativeInterval;
    } else {
      let promoData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9F');
      if(promoData === undefined) {
        promoData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9r');
      }
      console.log("2.Promo Data: " + promoData);
      return this.getCrunchedIntervalFromFFData(promoData);;
    }
  }

  //requires ffData
  public getPromoInterval(): Interval {
    if (!!this.promoInterval) return this.promoInterval;
    return this.initializePromoInterval();
  }

  private initializePromoInterval(): Interval {
    // let relStartData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0T');
    let relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0E');
    if(relData === undefined) {
      relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0r');
    }
    // if (relStartData) {
    if (relData) {
      // let relEndData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0F');

      // let relStartValue: string = relStartData.parts[0].value;
      // let relativeStart: Relative = this.getRelative(relStartValue);
      // let startDateTime: DateTime = DateTime.local().plus({ days: relativeStart.days, hours: relativeStart.hours, minutes: relativeStart.minutes });

      // let relativeEnd: Relative = this.getRelative(relEndData.parts[0].value);
      // let endDateTime: DateTime = startDateTime.plus({ days: relativeEnd.days, hours: relativeEnd.hours, minutes: relativeEnd.minutes });
      // let relativeInterval: Interval = {
      //   start: startDateTime,
      //   end: endDateTime
      // }
      // this.promoInterval = relativeInterval;
      // return this.promoInterval;
      let splitData: string[] = relData.parts[0].value.split(',');
      if (splitData.length != 2) {
        console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
      }
  
      let startString: string = splitData[0];
      let endString: string = splitData[1];
      let startDateTime: DateTime = DateTime.local().plus({ minutes: this.base64toNumber(startString) });
      let endDateTime: DateTime = startDateTime.plus({ minutes: this.base64toNumber(endString) });
      let relativeInterval: Interval = {
        start: startDateTime,
        end: endDateTime
      }
      this.promoInterval = relativeInterval;
      return this.promoInterval;
    } else {
      // let promoStartData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0S');
      // let promoEndData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0E');

      // this.promoInterval = this.getIntervalFromFFData(promoStartData, promoEndData);
      // return this.promoInterval;
      let promoData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9F');
      if(promoData === undefined) {
        promoData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9r');
      }
      console.log("3.Promo Data: " + promoData);
      this.promoInterval = this.getCrunchedIntervalFromFFData(promoData);
      return this.promoInterval;
    }
  }

  //requires ffData
  public getFormattedPromoStart(): string {
    return this.formatDateTime(this.getPromoInterval().start);
  }

  //requires ffData
  public getFormattedPromoEnd(): string {
    return this.formatDateTime(this.getPromoInterval().end);
  }

  public getPrice(): string {
    let ffPrice = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'p');
    if (!ffPrice) return null;
    let unpaddedBase64: string = ffPrice.parts[0].value;
    let priceNumber: number = this.base64toNumber(unpaddedBase64);
    priceNumber = priceNumber / 100;
    
    return priceNumber.toString();
  }

  public getItemLimit(): string {
    let ffLimit = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'm')
    if (!ffLimit) return null;
    let unpaddedBase64: string = ffLimit.parts[0].value;
    return this.base64toNumber(unpaddedBase64).toString();
  }

  //requires ffData
  public getSite(): string {
    if (!!this.site) return this.site;
    let siteFF = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (siteFF == null) return null;
    this.site = siteFF.parts[0].value;
    return this.site;
  }

  //requires ffData
  public getCustomSite(): string {
    let originalSite: String = this.getSite();
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return null
  }

  //requires ffData
  public getSurveyQuestion(): string {
    // if (!this.isSurvey()) return null;
    // if (!this.isFiveStarSurvey()) return null;
    let value : FFData;
    try {
      value = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '3');
      console.log("Value: " + value);
      return value.parts[0].value;
    } catch (error) {
      console.log("Error: " + error);
      return null;
    }
  }

  //requires ffData
  public getSurveySelection(): string {
    // if (!this.isSurvey()) return null;
    // if (!this.isFiveStarSurvey()) return null;
    let selectionFFData: FFData;
    try {
      selectionFFData = this.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O');
      let selectionFFDataParts = selectionFFData.parts.find(p => p.code === 'O')
      
      return selectionFFData.parts[0].value;
      // return selectionFFDataParts.value;
    } catch (error) {
      return null;
    }
  }

  //requires ffData
  public getFiveStarSurveySelection(): string {
    // if (!this.isSurvey()) return null;
    // if (!this.isFiveStarSurvey()) return null;
    // return "4.5"
    let selectionFFData: FFData;
    try {
      selectionFFData = this.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O');
      let selectionFFDataParts = selectionFFData.parts.find(p => p.code === 'O')
      console.log("05.ffData Code: " + selectionFFDataParts.code);
      console.log("05.ffData Value: " + selectionFFDataParts.value);
        // this.ffData.forEach(p => {
        //   console.log("0.ffData Code: " + p.code);
        //   console.log("0.ffData Type: " + p.type);
        //   p.parts.forEach(b => {
        //     console.log("0.ffData Part Code: " + b.code);
        //     console.log("0.ffData Part Value: " + b.value);
        //   });
        // });
      // return selectionFFData.parts[0].value;
      return selectionFFDataParts.value;
    } catch (error) {
      console.log("05.Five Star ERROR: " + error);
      return null;
    }
  }

  public comments: string;

  public setComments(com: string) {
    this.comments = com;
    // this.storage.set('surveyComments', data);
  }

  //requires ffData
  public getComments(): string {
    let selectionFFData: FFData;
    try {
      selectionFFData = this.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O');
      let selectionFFDataParts = selectionFFData.parts.find(p => p.code === 'C')
      // this.ffData.forEach(p => {
      //   console.log("1.ffData Code: " + p.code);
      //   console.log("1.ffData Type: " + p.type);
      //   p.parts.forEach(b => {
      //     console.log("1.ffData Part Code: " + b.code);
      //     console.log("1.ffData Part Value: " + b.value);
      //   });
      // });
      return selectionFFDataParts.value;
    } catch (error) {
      return null;
    }
    // return this.comments;
  }

  //requires ffData
  public getMaxGuests(): number {
    let maxGuestsFF = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'N');

    if (maxGuestsFF == null) return null;
    return this.base64toNumber(maxGuestsFF.parts[0].value);
  }

  //requires ffData
  public isMultiChoice() : boolean {
    if(this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'M')) {
      return true;
    } else {
      return false;
    }
  }

  //requires ffData
  public isComment() : boolean {
    if(this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'C')) {
      return true;
    } else {
      return false;
    }
  }

  //requires ffData
  public isWriteIn() : boolean {
    if(this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'W')) {
      return true;
    } else {
      return false;
    }
  }

  //requires ffData
  public isPromo(): boolean {
    const promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    const promoOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    // const eTicketOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
    // return (!!promoActionData || !!promoOptionData || !!eTicketOptionData);
    return (!!promoActionData || !!promoOptionData);
  }

  public isEvent(): boolean {
    const promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'D');
    // const promoOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    // const eTicketOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
    // return (!!promoActionData || !!promoOptionData || !!eTicketOptionData);
    // return (!!promoActionData || !!promoOptionData);
    return !!promoActionData;
  }

  public isEventWithGuest(): boolean {
    const promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'E');
    // const promoOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    // const eTicketOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
    // return (!!promoActionData || !!promoOptionData || !!eTicketOptionData);
    // return (!!promoActionData || !!promoOptionData);
    return !!promoActionData;
  }

  public getPromoType(): PromoType {
    if (this.promoType) return this.promoType;

    // let promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    // let promoOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    // // let eTicketOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 't');
    // if (promoActionData || promoOptionData) {
    //   this.promoType = PromoType.COUPON;
    // }
    // // } else if (eTicketOptionData) {
    // //   this.promoType = PromoType.VOUCHER;
    // // }

    const data: FFData = this.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'd'|| d.code === 'c' 
    || d.code === 'A' || d.code === 'P' || d.code === 'K'));

    if(!!data){
      if(data.code === 'd' ){
        this.promoType = PromoType.DRWAING
      }else if(data.code === 'c'){
        this.promoType =  PromoType.COUPON
      }else if(data.code === 'A' || data.code ==='P' || data.code ==='K'){
        this.promoType =  PromoType.PUNCH
      }
    }
    return this.promoType;
  }

  public isPromoType(): PromoType {
    let promo : PromoType
    let promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    let promoOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    if (promoActionData || promoOptionData) {
       promo = PromoType.COUPON;
    }
    return promo;
  }

  public isCoupon(): boolean {
    let couponOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    return !!couponOptionData;
  }

  public isCouponWhen2(databaseID:string): boolean { // when two ecoupon AQc
    let promoOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
    let promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    if (!!promoActionData && !!promoOptionData) {
      if(this._promoIDs?.length == 2 && this._promoIDs[0] == databaseID){
        return true;
      }
    } else if(!!promoOptionData){
      return true;
    }
    return false;
  }

  public isPromoToMobile(): boolean {
    let promoData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    return !!promoData;
  }

  public getRewardDateStart(): string {
    let incentRewardDate : string;
    let rewardDate : Interval = this.getRewardDate();
    if(rewardDate){
      if(rewardDate.start === null) return '';
      incentRewardDate = rewardDate.start.toISO();
      return this.formatDateTime(DateTime.fromISO(incentRewardDate)); 
    }
    return '';
  }

  public getRewardDateEnd(): string {
    let incentRewardDate : string;
    let rewardDate : Interval = this.getRewardDate();
    if(rewardDate){
      if(rewardDate.end === null) return '';
      incentRewardDate = rewardDate.end.toISO();
      return this.formatDateTime(DateTime.fromISO(incentRewardDate)); 
    }
    return '';
  }

  public getCouponDateText(): string {
    let incentCouponDate : string;
    let couponDate : Interval = this.getCouponDate();
    if(couponDate){
      if(couponDate.start === null && couponDate.end === null) return '';
      if(couponDate.end !== null) {
        incentCouponDate = couponDate.end.toISO();
      } else {
        incentCouponDate = couponDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate)); 
    }
    return '';
  }

  public getDrawingDateText(): string {
    let incentDrawingDate : string;
    let drawingDate : Interval = this.getDrawingDate();
    if(drawingDate){
      if(drawingDate.start === null && drawingDate.end === null) return '';
      if(drawingDate.end !== null) {
        incentDrawingDate = drawingDate.end.toISO();
      } else {
        incentDrawingDate = drawingDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentDrawingDate)); 
    }
    return '';
  }

  //requires ffData
  public isDrawing(): boolean {
    let drawingOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'd');
    return !!drawingOptionData;
  }

  public isPunch(): boolean {
    let drawingOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'U');
    return !!drawingOptionData;
  }

  public getCouponDate(): Interval {
    let relData, couponData;
    relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0r');
    couponData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9r');
    console.log("0.0.Coupon Data: " + couponData);
    console.log("0.0.Rel Data: " + relData);
    if (relData != null || couponData != null) {
      if(relData) {
        return this.getCouponCrunchedIntervalFromFFData(relData);
      }else{
        return this.getCrunchedIntervalFromFFData(couponData);
      }
    } else {
      relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0E');
      // if(relData === undefined) {
      //   relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0r');
      // }

      // couponData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9F');
      // if(couponData === undefined) {
      //   couponData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9r');
      // }
      console.log("0.1.Coupon Data: " + couponData);
      console.log("0.1.Rel Data: " + relData);
      if (relData != null || couponData != null) {
        if(relData) {
          return this.getCouponCrunchedIntervalFromFFData(relData);
        }else{
          return this.getCrunchedIntervalFromFFData(couponData);
        }
      }
    }
    return null
  }

  public getRewardDate(): Interval {
    let relData, rewardData;
    relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0R');
    rewardData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9R');
    if (relData != null || rewardData != null) {
      if(relData) {
        return this.getCrunchedIntervalFromFFData(relData);
      }else{
        return this.getCrunchedIntervalFromFFData(rewardData);
      }
    }
    return null
  }

   //isdrawing and drawing date
  public getDrawingDate(): Interval {
    let drawingOptionData = this.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'd');
    if (drawingOptionData) {
      let draingDate = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9d');
      return this.getCrunchedIntervalFromFFData(draingDate);
    }

    return null
  }

  public getPunchDate(): Interval {
    let relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0i');
    if (relData) {
      return this.getCrunchedIntervalFromFFData(relData);
    } else {
      let punchData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9i');
      if (punchData) {
        return this.getCrunchedIntervalFromFFData(punchData);
      }
    }
    return null
  }

  public getPunchDateText(): string {
    let relData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '0i');
    let date : Interval;
    if (relData) {
      date = this.getCrunchedIntervalFromFFData(relData);
    } else {
      let punchData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === '9i');
      if (punchData) {
        date = this.getCrunchedIntervalFromFFData(punchData);
      }
    }
    if(date === null) return '';
    let incentPunchDate : string;
    if(date.end !== null) {
      incentPunchDate = date.end.toISO();
    } else {
      incentPunchDate = date.start.toISO();
    }
    return this.formatDateTime(DateTime.fromISO(incentPunchDate));
  }

  //requires ffData
  public isPromoCampaignType(): boolean {
    const promoActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
    return !!promoActionData;
  }

  public isTrackerEmail(): boolean {
    let emailData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'G');
    return !!emailData;
  }

  public getTrackerEmail(): string {
    let emailData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'G');
    if (emailData) {
      return emailData.parts[0].value;
    }
    return null;
  }

  public isTrackerURL(): boolean {
    let urlData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'R');
    return !!urlData;
  }

  public getTrackerURL(): string {
    let urlData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'R');
    if (urlData) {
      return urlData.parts[0].value;
    }
    return null;
  }

  //requires ffData
  public getEngageType(): EngageType {
    if (!!this.engageType) return this.engageType;

    let val = this.ffData.find(d => d.type === SymbolType.Action);
    if (val) {
      switch (val.code) {
        case "D":
          return EngageType.EVENT_REGISTRATION;
        case "Q":
          return EngageType.PROMOTION;
        case "J":
          return EngageType.SURVEY;
        case "S":
            return EngageType.FIVESTARSURVEY;
        case "E":
          return EngageType.EVENT_WITH_GUEST;
        case "U":
          return EngageType.PUNCH;
        default:
          console.log("Unexpected code for engage type: " + val.code);
          return null;
      }
    }
    console.log("Could not find engage type in ffdata");
    return null;
  }

  //requires ffData
  public getCampIncentiveDescription(): string {
    let incentiveDescFF = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'd');
    if (incentiveDescFF == null) return null;
    return incentiveDescFF.parts[0].value;
  }

  public getIncentSite(): string {
    let incentiveSiteFF = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
    if (incentiveSiteFF == null) return null;
    return incentiveSiteFF.parts[0].value;
  }

  public getIncentLocation(): string {
    let incentiveLocation = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'l');
    if (incentiveLocation == null) return null;
    return incentiveLocation.parts[0].value;
  }

  public getRewardSite(): string {
    let rewardSiteFF = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'j');
    if (rewardSiteFF == null) return null;
    return rewardSiteFF.parts[0].value;
  }

  public getRewardLocation(): string {
    let rewardLocation = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'k');
    if (rewardLocation == null) return null;
    return rewardLocation.parts[0].value;
  }

  public getIncentPrice(): string {
    let ffPrice = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'p');
    if (!ffPrice) return null;
    let unpaddedBase64: string = ffPrice.parts[0].value;
    let priceNumber: number = this.base64toNumber(unpaddedBase64);
    priceNumber = priceNumber / 100;
    
    return priceNumber.toString();
  }

  public getIncentLimit(): string {
    let ffLimit = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'm')
    if (!ffLimit) return null;
    let unpaddedBase64: string = ffLimit.parts[0].value;
    return this.base64toNumber(unpaddedBase64).toString();
  }

  public getIncentiveDescription(): string {
    let incentiveDescFF = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'i');
    if (incentiveDescFF == null) return null;
    return incentiveDescFF.parts[0].value;
  }

  public isSurvey(): boolean {
    let surveyActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'J');
    return !!surveyActionData;
  }

  public isFiveStarSurvey(): boolean {
    let surveyActionData = this.ffData.find(d => d.type === SymbolType.Action && d.code === 'S');
    return !!surveyActionData;
  }

  //helper for getInverval() methods
  private getIntervalFromFFData(start: FFData, end: FFData): Interval {
    let interval: Interval = { start: null, end: null };
    //[yymmddThhmmaa]
    //start
    if (!!start && !!start.parts) {
      let intStart = start.parts[0].value;
      if (!!intStart) {
        //console.log('intStart: ' + intStart);
        interval.start = DateTime.fromObject({
          year: +('20' + intStart.substr(0, 2)),
          month: +intStart.substr(2, 2),
          day: +intStart.substr(4, 2),
          hour: +((intStart.length > 8) ? intStart.substr(7, 2) : '0') + (intStart.charAt(11) === 'P' ? 12 : 0),
          minute: +((intStart.length > 10) ? intStart.substr(9, 2) : '0'),
          zone: this.getRemoteClockMode() ? 'utc' : 'local'
        }).setZone('local');
      }
    }

    //end
    if (!!end && !!end.parts) {
      let intEnd = end.parts[0].value;
      //console.log('intEnd: ' + intEnd);
      if (!!intEnd) {
        interval.end = DateTime.fromObject({
          year: +('20' + intEnd.substr(0, 2)),
          month: +intEnd.substr(2, 2),
          day: +intEnd.substr(4, 2),
          hour: +((intEnd.length > 8) ? intEnd.substr(7, 2) : '23') + (intEnd.charAt(11) === 'P' ? 12 : 0),
          minute: +((intEnd.length > 10) ? intEnd.substr(9, 2) : '59'),
          zone: this.getRemoteClockMode() ? 'utc' : 'local'
        }).setZone('local');
      }
    }
    return interval;
  }

  //helper for getInverval() methods
  public getCouponCrunchedIntervalFromFFData(data: FFData): Interval {
    let interval: Interval = { start: null, end: null };

    if (data == null) {
      return interval;
    }

    let referenceDateTime: DateTime;
    if (this.getRemoteClockMode()) {
      referenceDateTime = DateTime.utc();
    } else {
      referenceDateTime = DateTime.local();
      Settings.defaultZoneName = "UTC";
    }

    let splitData: string[] = data.parts[0].value.split(',');
    if (splitData.length != 2) {
      console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
    }

    let startString: string = splitData[0];
    let endString: string;
    if (splitData.length > 1) {
      endString = splitData[1];
    }

    if (startString != null) {
      interval.start = referenceDateTime.plus({ minutes: this.base64toNumber(startString) });
    }
    if (endString != null) {
      interval.end = interval.start.plus({ minutes: this.base64toNumber(endString) });
    }

    return interval;
  }

  public getCrunchedIntervalFromFFData(data: FFData): Interval {
    let interval: Interval = { start: null, end: null };

    if (data == null) {
      return interval;
    }

    let referenceDateTime: DateTime;
    if (this.getRemoteClockMode()) {
      referenceDateTime = DateTime.utc(2022, 1, 1, 0, 0, 0, 0);
    } else {
      Settings.defaultZoneName = "UTC";
      referenceDateTime = DateTime.local(2022, 1, 1, 0, 0, 0, 0);
      // Settings.defaultZoneName = "UTC";
    }

    console.log("referenceDateTime: " + this.getRemoteClockMode());

    let splitData: string[] = data.parts[0].value.split(',');
    if (splitData.length != 2) {
      console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
    }

    let startString: string = splitData[0];
    let endString: string;
    if (splitData.length > 1) {
      endString = splitData[1];
    }

    if (startString != null) {
      interval.start = referenceDateTime.plus({ minutes: this.base64toNumber(startString) });
    }
    if (endString != null) {
      interval.end = referenceDateTime.plus({ minutes: this.base64toNumber(endString) });
    }

    return interval;
  }
  
  public base64toNumber(unpaddedBase64: string): number {
    let padded: string = unpaddedBase64;
    while (padded.length % 4 != 0) {
      padded = padded.concat("=");
    }
    let binaryString: string = atob(padded);
    let bytes: Uint8Array = new Uint8Array(4);
    let iterations: number = 0;
    for (var i = 4 - binaryString.length; i <= 4; i++) {
      bytes[i] = binaryString.charCodeAt(iterations);
      iterations++;
    }
    return new DataView(bytes.buffer, 0).getUint32(0);
  }

  private getRelative(relativeString: string): Relative {
    let relDays: number = Number(relativeString.substring(0, 2));
    let relHours: number = Number(relativeString.substring(2, 4));
    let relMinutes: number = Number(relativeString.substring(4, 6));
    let relative: Relative = {
      days: relDays,
      hours: relHours,
      minutes: relMinutes
    }
    return relative;
  }

  //requires ffData
  public getSurveyOptions(): string[] {
    // if (!!this.surveyOptions) return this.surveyOptions;
    // let options: string[] = [];
    // const optionsData: FFData = this.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'O');
    // optionsData.value.replace(/(\r\n\t|\n|\r\t)/gm, '').split('◙') // <- SURVEY OPTIONS DELIMITER
    //   .forEach((o: string) => options.push(o));
    // this.surveyOptions = options;
    // return this.surveyOptions;
    return null;
  }

  public getActionResponse(): string {
    return this.actionResponse;
  }

  public setActionResponse(response: string) {
    this.actionResponse = response;
  }

  public getFormattedSubmitTime(): string {
    let procTimeMs = this.processedTime;

    if (procTimeMs !== undefined) {
      Settings.defaultZoneName = "LOCAL";
      let date : string = this.formatDateTime(DateTime.fromMillis(procTimeMs));
      Settings.defaultZoneName = "UTC";
      return date;
    }
    return null;
  }

  public updateStatus() {
    if (!this.tasks) {
      this.statusSubject.next(TaskStatus.COMPLETE);
      return;
    }
    if (this.tasks.some(t => t.status === TaskStatus.FAILED)) {
      this.statusSubject.next(TaskStatus.FAILED);
      return;
    }
    if (this.tasks.some(t => t.status === TaskStatus.IN_PROGRESS)) {
      this.statusSubject.next(TaskStatus.IN_PROGRESS);
      return;
    }
    this.statusSubject.next(TaskStatus.COMPLETE);
  }

  public get isDummy(): boolean {
    return this._isDummy;
  }
  public set isDummy(value: boolean) {
    this._isDummy = value;
  }
}

export interface Task {
  type: TaskType,
  status: TaskStatus,
}

export enum TaskType {
  REST_POST = 'Rest Post',
  EMAIL = 'Email',
  //REMINDER = 2, // 'Reminder',
  GENERATE_PROMO = 'Promo'
}

export enum TaskStatus {
  IN_PROGRESS = 'In Progress',
  COMPLETE = 'Complete',
  FAILED = 'Failed'
}

export class EmailTask implements Task {
  constructor(
    public emailAddr: string,
    public status: TaskStatus
  ) { }
  get type(): TaskType { return TaskType.EMAIL }
}

export class RestPostTask implements Task {
  constructor(
    public url: string,
    public status: TaskStatus
  ) { }
  get type(): TaskType { return TaskType.REST_POST }
}

export class PromoGenTask implements Task {
  constructor(
    public promoType: PromoType,
    public databaseID: string,
    public promoQRData: string,
    public status: TaskStatus
  ) { }
  get type(): TaskType { return TaskType.GENERATE_PROMO }
}

//
//  DATABASE
//
export interface Persistant {
  databaseID: string
}


//
//  PROMO
//
export enum PromoType {
  VOUCHER = 'eVoucher',
  REDEEM = 'eRedeem',
  COUPON = 'eCoupon',
  TICKET = 'eTicket',
  PUNCH = 'ePunch Card',
  DRWAING = 'Drawing'
}

export enum BonusType {
  VOUCHER = 'eVoucher',
  REDEEM = 'eRedeem',
  COUPON = 'eCoupon',
  TICKET = 'eTicket',
  PUNCH = 'ePunch Card',
  DRWAING = 'Drawing'
}

export enum RedeemStatus {
  DEFERRED = "Deferred",
  AVAILABLE = 'Available',
  REDEEMED = 'Redeemed',
  SUBMITTED = 'Submitted',
  EXPIRED = 'Expired',
  // CANCELED = 'Canceled',
  PENDING = 'Pending',
  NO_CARD = 'No Card', // punch
  OPEN = 'Open', // punch
  CLOSED = 'Closed', // punch
  ENTERED = 'Entered'
}

export enum RedeemSource {
  OPT_IN = "Opt-In",
  INCENTIVE = "Reward"
}

export class FFPunchPropertiesParser {
  public static getPunchType(ffData: FFData[]): PunchType {
    if (ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'A')) {
      return PunchType.COUNT;
    }
    if (ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'P')) {
      return PunchType.PURCHASES;
    }
    if (ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'K')) {
      return PunchType.CHECK_IN;
    }
    return null;
  }

  public static getPunchesNeeded(ffData: FFData[]): number {
    let punchesNeededFF = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'c');
    if (punchesNeededFF == null) return null;
    // return Number(punchesNeededFF.parts[0].value);
    return this.base64toNumber(punchesNeededFF.parts[0].value);
  }

  // Diffrence between cCode and pcode is actionOption = '2'. And this actionOption is only in pCode. 
  public static is_pCode(ffData: FFData[]): boolean {
    let ispCode = ffData.find(d => d.type === SymbolType.ActionOption && d.code === '2');
    if(ispCode){
      // console.log("ispCode",ispCode); 
      return true;
    }
    return false;
  }

  public static getMaxPunchCards(ffData: FFData[]): number {
    let maxPunchCardsFF = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'W');
    if (maxPunchCardsFF == null) return null;
    // return Number(maxPunchCardsFF.parts[0].value);    
    return this.base64toNumber(maxPunchCardsFF.parts[0].value);
  }

  public static getActionText(ffData: FFData[]): string {
    let maxPunchCardsFF = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'a');
    if (maxPunchCardsFF == null) return null;
    return maxPunchCardsFF.parts[0].value
  }

  public static getPunchesStarter(ffData: FFData[]): number {
    let punchesStarterFF = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'V');
    if (punchesStarterFF == null) return null;
    return Number(punchesStarterFF.parts[0].value);
  }

  public static getPunchIncentiveDescription(ffData: FFData[]): string {
    let punchIncentiveDescFF = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'd');
    if (punchIncentiveDescFF == null) return null;
    return punchIncentiveDescFF.parts[0].value;
  }

  public static getPunchSponsor(ffData: FFData[]): string {
    let ffVal = ffData.find(d => d.type === SymbolType.QRCode && d.code === 's');
    if (ffVal == null) return null;
    return ffVal.parts[0].value;
  }

  public static getRedeemMethod(ffData: FFData[]): RedeemMethod {
    const redeemData: FFData = ffData.find(d => d.type === SymbolType.QRCode && d.code === '7');
    if (!redeemData) return null;

    let value = redeemData.parts[0].value;
    if (value === 'S') {
      return RedeemMethod.SELF;
    } else if (value === 'T') {
      return RedeemMethod.TRACKER;
    } else if (value === 'Q') {
      return RedeemMethod.QUICK;
    } else {
      console.log("Unexpected value for redeem method: " + value);
      return RedeemMethod.NONE;
    }
  }

  public static getPromoInterval(ffData: FFData[]): Interval {
    // TODO relative?
    // let promoStartData = ffData.find(d => d.type === SymbolType.QRCode && d.code === '0s');
    // let promoEndData = ffData.find(d => d.type === SymbolType.QRCode && d.code === '0e');

    // return this.getIntervalFromFFData(promoStartData, promoEndData, ffData);
    let promoTimeData = ffData.find(d => d.type === SymbolType.QRCode && d.code === '9R');
    if (promoTimeData) {      
      return this.getCrunchedIntervalFromFFData(promoTimeData, ffData);
    } else {
      //relative time parsing
      promoTimeData = ffData.find(d => d.type === SymbolType.QRCode && d.code === '0R');
      if (promoTimeData) {
        
        let splitData: string[] = promoTimeData.parts[0].value.split(',');
        if (splitData.length != 2) {
          console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
        }
    
        let startString: string = splitData[0];
        let endString: string = splitData[1];
        let startDateTime: DateTime = DateTime.local().plus({ minutes: this.base64toNumber(startString) });
        let endDateTime: DateTime = startDateTime.plus({ minutes: this.base64toNumber(endString) });
        let relativeInterval: Interval = {
          start: startDateTime,
          end: endDateTime
        }
        
        return relativeInterval;
      } else {
        console.log("Could not find reward interval data id");
        let dummyInterval: Interval = { start: null, end: null };
        return dummyInterval;
      }
    }
  }

  //helper for getInverval() methods
  private static getIntervalFromFFData(start: FFData, end: FFData, ffData: FFData[]): Interval {
    let interval: Interval = { start: null, end: null };
    //[yymmddThhmmaa]
    //start
    if (!!start && !!start.parts) {
      let intStart = start.parts[0].value;
      if (!!intStart) {
        //console.log('intStart: ' + intStart);
        interval.start = DateTime.fromObject({
          year: +('20' + intStart.substr(0, 2)),
          month: +intStart.substr(2, 2),
          day: +intStart.substr(4, 2),
          hour: +((intStart.length > 8) ? intStart.substr(7, 2) : '0') + (intStart.charAt(11) === 'P' ? 12 : 0),
          minute: +((intStart.length > 10) ? intStart.substr(9, 2) : '0'),
          zone: this.getRemoteClockMode(ffData) ? 'utc' : 'local'
        }).setZone('local');
      }
    }

    //end
    if (!!end && !!end.parts) {
      let intEnd = end.parts[0].value;
      //console.log('intEnd: ' + intEnd);
      if (!!intEnd) {
        interval.end = DateTime.fromObject({
          year: +('20' + intEnd.substr(0, 2)),
          month: +intEnd.substr(2, 2),
          day: +intEnd.substr(4, 2),
          hour: +((intEnd.length > 8) ? intEnd.substr(7, 2) : '23') + (intEnd.charAt(11) === 'P' ? 12 : 0),
          minute: +((intEnd.length > 10) ? intEnd.substr(9, 2) : '59'),
          zone: this.getRemoteClockMode(ffData) ? 'utc' : 'local'
        }).setZone('local');
      }
    }
    return interval;
  }

  //helper for getInverval() methods
  private static getCrunchedIntervalFromFFData(timeData: FFData, ffData: FFData[]): Interval {
    let interval: Interval = { start: null, end: null };

    let referenceDateTime: DateTime;
    if (this.getRemoteClockMode(ffData)) {
      referenceDateTime = DateTime.uct(2022, 1, 1, 0, 0, 0, 0);
    } else {
      referenceDateTime = DateTime.local(2022, 1, 1, 0, 0, 0, 0);
      Settings.defaultZoneName = "UTC";
    }

    let splitData: string[] = timeData.parts[0].value.split(',');
    if (splitData.length != 2) {
      console.log("Unexpected length of splitdata: " + splitData.length + ", contents: " + splitData);
    }

    let startString: string = splitData[0];
    let endString: string = splitData[1];

    interval.start = referenceDateTime.plus({ minutes: this.base64toNumber(startString) });
    interval.end = referenceDateTime.plus({ minutes: this.base64toNumber(endString) });

    return interval;
  }

  private static base64toNumber(unpaddedBase64: string): number {
    let padded: string = unpaddedBase64;
    while (padded.length % 4 != 0) {
      padded = padded.concat("=");
    }
    let binaryString: string = atob(padded);
    let bytes: Uint8Array = new Uint8Array(4);
    let iterations: number = 0;
    for (var i = 4 - binaryString.length; i <= 4; i++) {
      bytes[i] = binaryString.charCodeAt(iterations);
      iterations++;
    }
    return new DataView(bytes.buffer, 0).getUint32(0);
  }

  private static getRemoteClockMode(ffData: FFData[]): boolean {
    let remoteClockData: FFData = ffData.find(d => d.type === SymbolType.QRCode && d.code === 'K');
    return !!remoteClockData;
  }
}

export enum PunchType {
  COUNT = "Count",
  PURCHASES = "Purchases",
  CHECK_IN = "Check In"
}

export enum DeliveryMethod {
  EMAIL,
  REST
}

export class Punch {
  private _campaignID: string;
  private _destinationAddress: string;
  private _deliveryMethod: DeliveryMethod;
  private _punchType: PunchType;
  private _starterPunches: number;
  private _cardLimit: number;
  private _cardCount: number = 1;
  private _punchesRequired: number;
  private _punchCount: number = 0;
  private _actionText: string;

  public get actionText(): string {
    return this._actionText;
  }
  public set actionText(value: string) {
    this._actionText = value;
  }

  public get campaignID(): string {
    return this._campaignID;
  }
  public set campaignID(value: string) {
    this._campaignID = value;
  }

  public get destinationAddress(): string {
    return this._destinationAddress;
  }
  public set destinationAddress(value: string) {
    this._destinationAddress = value;
  }

  public get deliveryMethod(): DeliveryMethod {
    return this._deliveryMethod;
  }
  public set deliveryMethod(value: DeliveryMethod) {
    this._deliveryMethod = value;
  }

  public get punchType(): PunchType {
    return this._punchType;
  }
  public set punchType(value: PunchType) {
    this._punchType = value;
  }

  public get starterPunches(): number {
    return this._starterPunches;
  }
  public set starterPunches(value: number) {
    this._starterPunches = value;
  }

  public get cardLimit(): number {
    return this._cardLimit;
  }
  public set cardLimit(value: number) {
    this._cardLimit = value;
  }

  public get cardCount(): number {
    return this._cardCount;
  }
  public set cardCount(value: number) {
    this._cardCount = value;
  }


  public get punchesRequired(): number {
    return this._punchesRequired;
  }
  public set punchesRequired(value: number) {
    this._punchesRequired = value;
  }

  public get punchCount(): number {
    return this._punchCount;
  }
  public set punchCount(value: number) {
    this._punchCount = value;
  }
}
export class Promo implements Persistant {
  // TODO cleanup which fields are required in constructor vs with are optional
  public redeemMethod: RedeemMethod;
  public redeemMethodAllowed: boolean;
  public redeemSource: RedeemSource;
  public campaignDescription: string;
  public canceled: boolean;

  private _punch: Punch;
  // transient
  fulfillment: Fulfillment;

  constructor(
    public databaseID: string,
    public parentID: string,
    public qrData: string,
    public redeemStatus: RedeemStatus,
    public initiateTime: number,
    public description: string,
    public org: string,
    public type: PromoType,
    public startDateTime: string,
    public endDateTime: string,
    public itemDescription: string,
    public price: string,
    public limit: string,
    public site: string,
    public location: string,
    public addedTime: number
  ) { }

  getFormattedSubmitTime(): string {
    let procTimeMs = this.addedTime;

    if (procTimeMs !== undefined && procTimeMs != null) {
      Settings.defaultZoneName = "LOCAL";
      let date : string = this.formatDateTime(DateTime.fromMillis(procTimeMs));
      Settings.defaultZoneName = "UTC";
      return date;
    }
    return null;
  }

  getRewards(): string{
    if(this.fulfillment?.promoIDs != null && this.fulfillment?.promoIDs != undefined && this.fulfillment?.promoIDs.length > 0){
      let value: number = this.fulfillment?.promoIDs?.length - 1;
      return value.toString();
    }
    return "0";
  }

  public isCanceled(): boolean {
    return this.canceled;
  }

  public setCanceled(canceled: boolean) {
    this.canceled = canceled;
  }

  public getRewardSite(): string {
    let originalSite: string = this.fulfillment?.getRewardSite();
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    } else if(!!this.site){
      originalSite = this.site;
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return originalSite;
  }

  public getRewardLocation(): string {
    let originalLocation: string = this.fulfillment?.getRewardLocation();
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    } else if(!!this.location){
      originalLocation = this.location;
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return originalLocation;
  }

  public getSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) != '~') {
        return this.site;
      }
    }
    return null;
  }

  public getCustomSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return null;
  }

  public getCustomLocation(): string {
    let originalLocation: String = this.location;
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return null;
  }

  getStartDateTime(): DateTime {
    return DateTime.fromISO(this.startDateTime);
  }

  getEndDateTime(): DateTime {
    return DateTime.fromISO(this.endDateTime);
  }

  getFormattedStartDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.startDateTime));
  }

  getFormattedEndDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.endDateTime));
  }

  getRewardDateStart(): string {
    if(this.fulfillment != null && this.fulfillment != undefined) {
      return this.fulfillment?.getRewardDateStart()
    }
    return '';
  }

  getRewardDateEnd(): string {
    if(this.fulfillment != null && this.fulfillment != undefined) {
      return this.fulfillment?.getRewardDateEnd()
    }
    return '';
  }

  getCouponDate(): string {
    let incentCouponDate : string;
    if(this.fulfillment?.getBonusType() === BonusType.COUPON){
      let couponDate : Interval = this.fulfillment.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null && couponDate.end === null) return '';
      if(couponDate.end !== null) {
        incentCouponDate = couponDate.end.toISO();
      } else {
        incentCouponDate = couponDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    } else if(this.fulfillment != null && this.fulfillment != undefined) {
      return this.fulfillment?.getCouponDateText()
    }
    return '';
  }

  getCouponDateStart(): string {
    let incentCouponDate : string;
    if(this.type === PromoType.COUPON){
      let couponDate : Interval = this.fulfillment.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null) { return ''; }
      else{ incentCouponDate = couponDate.start.toISO(); }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    } else if(this.fulfillment != null && this.fulfillment != undefined) {
      let couponDate : Interval = this.fulfillment?.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null) { return ''; }
      else{ incentCouponDate = couponDate.start.toISO(); }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    }
    return '';
  }

  getDrawingDate(): string {
    let incentDrawingDate : string;
    if(this.fulfillment?.getBonusType() === BonusType.DRWAING){
      if(this.fulfillment.getDrawingDate() === null) return '';
      if(this.fulfillment.getDrawingDate().start === null && this.fulfillment.getDrawingDate().end === null) return '';
      if(this.fulfillment.getDrawingDate().end !== null) {
        incentDrawingDate = this.fulfillment.getDrawingDate().end.toISO();
      } else {
        incentDrawingDate = this.fulfillment.getDrawingDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentDrawingDate));
    } else if(this.fulfillment != null && this.fulfillment != undefined) {
      return this.fulfillment?.getDrawingDateText()
    }
    return '';
  }

  getPunchDate(): string {
    let incentPunchDate : string;
    try {
      if(this.fulfillment?.getBonusType() === BonusType.PUNCH){
        if(this.fulfillment.getPunchDate() === null) return '';
        if(this.fulfillment.getPunchDate().start === null && this.fulfillment.getPunchDate().end === null) return '';
        if(this.fulfillment.getPunchDate().end !== null) {
          incentPunchDate = this.fulfillment.getPunchDate().end.toISO();
        } else {
          incentPunchDate = this.fulfillment.getPunchDate().start.toISO();
        }
        return this.formatDateTime(DateTime.fromISO(incentPunchDate));
      }else if(this.fulfillment != null && this.fulfillment != undefined) {
        return this.fulfillment?.getPunchDateText()
      } 
    } catch (error) {
      return '';
    }
    return '';
  }

  getPunchDateStart(): string {
    let incentPunchDate : string;
    try {
      if(this.type === PromoType.PUNCH){
        let punchDate : Interval = this.fulfillment?.getPunchDate();
        if(punchDate === null) return '';
        if(punchDate.start === null) return '';
        incentPunchDate = punchDate.start.toISO();
        return this.formatDateTime(DateTime.fromISO(incentPunchDate));
      } else if(this.fulfillment != null && this.fulfillment != undefined) {
        let punchDate : Interval = this.fulfillment?.getPunchDate();
        if(punchDate === null) return '';
        if(punchDate.start === null) return '';
        incentPunchDate = punchDate.start.toISO();
        return this.formatDateTime(DateTime.fromISO(incentPunchDate));
      }
    } catch (error) {
      return '';
    }
    
    return '';
  }

  getIncentLabel(): string {
    return this.fulfillment?.getIncentLabel();
  }

  private formatDateTime(dateTime: DateTime) {
    if (!dateTime) return null;
    const datetime= dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    // console.log("0.DateTime::::" + datetime);
    return datetime;
  }

  public get punch(): Punch {
    return this._punch;
  }
  public set punch(value: Punch) {
    this._punch = value;
  }

  getParentCampaign(): Fulfillment {
    return this.fulfillment;
  }

  setParentCampaign(fulfillment: Fulfillment) {
    this.fulfillment = fulfillment;
  }

  public isCouponWhen2(): boolean {
    return this.fulfillment?.isCouponWhen2(this.databaseID)
  }

  public getIncentiveDescription(): string {
    return this.fulfillment?.getIncentiveDescription();
  }

  public getCampIncentiveDescription(): string {
    return this.fulfillment?.getCampIncentiveDescription();
  }

  public getIncentSite(): string {
    let originalSite: String = this.fulfillment?.getIncentSite();
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return this.fulfillment?.getIncentSite();
  }

  public getIncentCustomSite(): string {
    let originalSite: String = this.fulfillment?.getIncentSite();
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return this.fulfillment?.getIncentSite();
  }

  public getIncentLocation(): string {
    let originalLocation: String = this.fulfillment?.getIncentLocation();
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return this.fulfillment?.getIncentLocation();
  }

  public getIncentPrice(): string {
    return this.fulfillment?.getIncentPrice();
  }

  public getIncentLimit(): string {
    return this.fulfillment?.getIncentLimit();
  }

  public getIncentOrg(): string {
    return this.fulfillment?.getIncentOrg();
  }

  public getRedeemMethod(): RedeemMethod {
    return this.fulfillment?.getRedeemMethod();
  }

  public getIncentType(): string {
    return this.fulfillment?.getBonusType();
  }

  public getPromoType(): PromoType {
    return this.fulfillment?.getPromoType();
  }

  public isPromoType(): PromoType {
    return this.fulfillment?.isPromoType();
  }

  public isCoupon(): boolean {
    return this.fulfillment?.isCoupon();
  }

  public isDrawing(): boolean {
    return this.fulfillment?.isDrawing();
  }
  
  public isPromoToMobile(): boolean {
    return this.fulfillment?.isPromoToMobile();
  }

  public isPunch(): boolean {
    return this.fulfillment?.isPunch();
  }

  getEpunchWiseText1(): string{
    const data: FFData = this.fulfillment?.ffData?.find(d => d.type === SymbolType.ActionOption && (d.code === 'K'));
    if(data || this._punch?.punchType === PunchType.CHECK_IN) {
      return 'Check-ins';
    }
    return 'ePunches';
  }

  getEpunchWiseText2(): string{
    let text: string = '';
    const data: FFData = this.fulfillment?.ffData?.find(d => d.type === SymbolType.ActionOption && (d.code === 'P'));
    if(data || this._punch?.punchType === PunchType.PURCHASES) {
      if(this.punch.punchCount) {
        text = '$' + this.punch.punchCount + ' of $';
      }else { text = '$' + 0 + ' of $'; }

      if(this.punch.punchesRequired) {
        text = text + this.punch.punchesRequired;
      } else { text = text + 'N/A'; }

      return text;
    }else{
      if(this.punch.punchCount) {
        text = this.punch.punchCount + ' of ';
      }else text = 0 + ' of ';
      if(this.punch.punchesRequired) {
        text = text + this.punch.punchesRequired;
      } else { text = text + 'N/A'; }

      return text;
    }
  }

  public getActionText(): string {
    return FFPunchPropertiesParser.getActionText(this.fulfillment?.ffData);
  }

  getEpunchWiseText(): string{
    const data: FFData = this.fulfillment?.ffData?.find(d => d.type === SymbolType.ActionOption && (d.code === 'P'));
    if(data || this._punch?.punchType === PunchType.PURCHASES) {
      return '$ ePunches';
    }
    return '1 ePunch';
  }

  getPunchTypeText(): string{
    if(this._punch?.punchType === PunchType.PURCHASES) {
      return 'Purchase ePunch Card';
    }else if(this._punch?.punchType === PunchType.CHECK_IN) {
      return 'Check-in ePunch Card';
    }
    return 'ePunch Card';
  }

  getNocardStartDate(): string {
    if (this.fulfillment != undefined && this.parentID == null) {
      let startDateTime;
      try {
        if (this.fulfillment.getEngageType() === EngageType.PROMOTION || this.fulfillment.getEngageType() === EngageType.PUNCH) {
          startDateTime = this.fulfillment.getPromoIntervalNew().start.toISO();
        } else if (this.fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST || this.fulfillment.getEngageType() === EngageType.EVENT_REGISTRATION){
          startDateTime = this.fulfillment.getEventInterval().start.toISO();
        } else if (this.fulfillment.getEngageType() === EngageType.SURVEY){
          startDateTime = this.fulfillment.getCampaignInterval().start;
        } else if (this.fulfillment.getEngageType() === EngageType.FIVESTARSURVEY){
          startDateTime = this.fulfillment.getCampaignInterval().start;
        } else{
          startDateTime = this.fulfillment.getCampaignInterval().start.toISO();
        }
        return this.formatDateTime(DateTime.fromISO(startDateTime));
      } catch (error) {
        return null
      }  
    }
    return null
  }

  getNocardEndDate(): string {
    if (this.fulfillment != undefined && this.parentID == null) {
      let endDateTime;
      try {
        if (this.fulfillment.getEngageType() === EngageType.PROMOTION || this.fulfillment.getEngageType() === EngageType.PUNCH) {
          endDateTime = this.fulfillment.getPromoIntervalNew().end.toISO();
        } else if (this.fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST || this.fulfillment.getEngageType() === EngageType.EVENT_REGISTRATION){
          endDateTime = this.fulfillment.getEventInterval().end.toISO();
        } else if (this.fulfillment.getEngageType() === EngageType.SURVEY){
          endDateTime = this.fulfillment.getCampaignInterval().end;
        } else if (this.fulfillment.getEngageType() === EngageType.FIVESTARSURVEY){
          endDateTime = this.fulfillment.getCampaignInterval().end;
        } else{
          endDateTime = this.fulfillment.getCampaignInterval().end.toISO();
        }
        return this.formatDateTime(DateTime.fromISO(endDateTime));
      } catch (error) {
        return null
      }
    }
    return null
  }
}

export class PunchData implements Persistant {
  // TODO cleanup which fields are required in constructor vs with are optional
  public redeemMethod: RedeemMethod;
  public redeemMethodAllowed: boolean;
  public redeemSource: RedeemSource;
  public campaignDescription: string;
  public canceled: boolean;

  private _punch: Punch;
  // transient
  fulfillment: Fulfillment;

  constructor(
    public databaseID: string,
    public parentID: string,
    public qrData: string,
    public redeemStatus: RedeemStatus,
    public initiateTime: number,
    public description: string,
    public org: string,
    public type: PromoType,
    public startDateTime: string,
    public endDateTime: string,
    public itemDescription: string,
    public price: string,
    public limit: string,
    public site: string,
    public location: string,
    public addedTime: number
  ) { }

  public isCanceled(): boolean {
    return this.canceled;
  }

  public setCanceled(canceled: boolean) {
    this.canceled = canceled;
  }

  public getCustomSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return null;
  }

  public getSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) != '~') {
        return this.site;
      }
    }
    return null;
  }

  // public getCustomSite1(): string {
  //   let CustomSite : string;
  //   let siteFF = this.fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
  //   // let incentSiteFF = this.fulfillment.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'e');
  //   // if (incentSiteFF != null) {
  //   //   CustomSite = incentSiteFF.parts[0].value;
  //   //   if (!!CustomSite) {
  //   //     if (CustomSite.charAt(0) == '~') {
  //   //       return CustomSite.substring(1);
  //   //     }
  //   //   }
  //   // }else 
  //   if(siteFF !=null){
  //     CustomSite = siteFF.parts[0].value;
  //     if (!!CustomSite) {
  //       if (CustomSite.charAt(0) == '~') {
  //         return CustomSite.substring(1);
  //       }
  //     }
  //   }
  //   return null;
  // }

  public getCustomLocation(): string {
    let originalLocation: String = this.location;
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return null;
  }

  getStartDateTime(): DateTime {
    return DateTime.fromISO(this.startDateTime);
  }

  getEndDateTime(): DateTime {
    return DateTime.fromISO(this.endDateTime);
  }

  getFormattedStartDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.startDateTime));
  }

  getFormattedEndDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.endDateTime));
  }

  getCouponDate(): string {
    let incentCouponDate : string;
    if(this.type === PromoType.COUPON){
      let couponDate : Interval = this.fulfillment.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null && couponDate.end === null) return '';
      if(couponDate.end !== null) {
        incentCouponDate = couponDate.end.toISO();
      } else {
        incentCouponDate = couponDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    }
    return '';
  }

  getDrawingDate(): string {
    let incentDrawingDate : string;
    if(this.type === PromoType.DRWAING){
      let drawingDate : Interval = this.fulfillment.getDrawingDate();
      if(drawingDate === null) return '';
      if(drawingDate.start === null && drawingDate.end === null) return '';
      if(drawingDate.end !== null) {
        incentDrawingDate = drawingDate.end.toISO();
      } else {
        incentDrawingDate = drawingDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentDrawingDate));
    }
    return '';
  }

  isEcoupon(): boolean{
    if(this.type == PromoType.COUPON){
      return true;
    }
    return false;
  }

  isEdrawing(): boolean{
    if(this.type == PromoType.DRWAING){
      return true;
    }
    return false;
  }

  getRewards(): string{
    if(this.fulfillment.promoIDs!= null && this.fulfillment.promoIDs != undefined && this.fulfillment.promoIDs.length > 0){
      if(this.isEcoupon() || this.isEdrawing()){
        let val : number = this.fulfillment.promoIDs.length - 1;
        if(val > 0)
          return val.toString();
      } else {
        return this.fulfillment.promoIDs.length.toString();
      }
    }
    return "0";
  }

  getEpunchWiseText(): string{
    const data: FFData = this.fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'P'));
    if(data) {
      return '$ ePunches';
    }
    return '1 ePunch';
  }

  getEpunchWiseText1(): string{
    const data: FFData = this.fulfillment?.ffData?.find(d => d.type === SymbolType.ActionOption && (d.code === 'K'));
    if(data) {
      return 'Check-ins';
    }
    return 'ePunches';
  }

  getEpunchWiseText2(): string{
    let text: string = '';
    const data: FFData = this.fulfillment?.ffData?.find(d => d.type === SymbolType.ActionOption && (d.code === 'P'));
    if(data) {
      if(this.punch.punchCount) {
        text = '$' + this.punch.punchCount + ' of $';
      }else { text = '$' + 0 + ' of $'; }

      if(this.punch.punchesRequired) {
        text = text + this.punch.punchesRequired;
      } else { text = text + 'N/A'; }

      return text;
    }else{
      if(this.punch.punchCount) {
        text = this.punch.punchCount + ' of ';
      }else text = 0 + ' of ';
      if(this.punch.punchesRequired) {
        text = text + this.punch.punchesRequired;
      } else { text = text + 'N/A'; }

      return text;
    }
  }

  getEpunchWiseText3(): string{
    let text: string = '';
    const data: FFData = this.fulfillment.ffData.find(d => d.type === SymbolType.ActionOption && (d.code === 'P'));
    if(data) {
      if(this.punch.punchesRequired) {
        text = '$' + this.punch.punchesRequired;
      } else { text = text + 'N/A'; }
      return text;
    }else{
      if(this.punch.punchesRequired) {
        text = '' + this.punch.punchesRequired;
      } else { text = 'N/A'; }
      return text;
    }
  }

  getIncentLabel(): string {
    try {
      return this.fulfillment?.getIncentLabelForNoCard();
    } catch (error) {
      return this.fulfillment?.getIncentLabel();
    }
  }

  getIncentStatus(): string {
    try {
      if(this.fulfillment?.isDrawing())
        return 'Entered';
    } catch (error) {
      return null;
    }
    return null;
  }

  private formatDateTime(dateTime: DateTime) {
    if (!dateTime) return null;
    const datetime = dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    // console.log("1.DateTime::::" + datetime);
    return datetime;
  }

  public get punch(): Punch {
    return this._punch;
  }
  public set punch(value: Punch) {
    this._punch = value;
  }

  getParentCampaign(): Fulfillment {
    return this.fulfillment;
  }

  setParentCampaign(fulfillment: Fulfillment) {
    this.fulfillment = fulfillment;
  }

  public getIncentiveDescription(): string {
    return this.fulfillment.getIncentiveDescription();
  }

  public getIncentOrg(): string {
    return this.fulfillment.getIncentOrg();
  }

  public getRedeemMethod(): RedeemMethod {
    return this.fulfillment.getRedeemMethod();
  }

  public getActionText(): string {
    return FFPunchPropertiesParser.getActionText(this.fulfillment.ffData);
  }
}

export class EventWGuestData implements Persistant {
   // TODO cleanup which fields are required in constructor vs with are optional
   public redeemMethod: RedeemMethod;
   public redeemMethodAllowed: boolean;
   public redeemSource: RedeemSource;
   public campaignDescription: string;
   public canceled: boolean;
 
   private _punch: Punch;
   // transient
   fulfillment: Fulfillment;

  constructor(
    public databaseID: string,
    public parentID: string,
    public qrData: string,
    public redeemStatus: RedeemStatus,
    public initiateTime: number,
    public description: string,
    public org: string,
    public type: BonusType,
    public startDateTime: string,
    public endDateTime: string,
    public itemDescription: string,
    public price: string,
    public limit: string,
    public site: string,
    public location: string,
    public guestLimit: number,
    public guestSelected: number,
    public incentOrg: string,
    public incentDesc: string,
    public addedTime: number
  ) { 
  }

  getRewards(): string{
    if(this.fulfillment?.promoIDs != null && this.fulfillment?.promoIDs != undefined && this.fulfillment?.promoIDs.length > 0){
      return this.fulfillment?.promoIDs?.length.toString();
    }
    return "0";
  }

  public isCanceled(): boolean {
    return this.canceled;
  }

  public setCanceled(canceled: boolean) {
    this.canceled = canceled;
  }

  public getCustomSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return null;
  }

  public getCustomLocation(): string {
    let originalLocation: String = this.location;
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return null;
  }

  getIncentLabel(): string {
    return this.fulfillment.getIncentLabel();
  }

  getIncentStatus(): string {
    try {
      if(this.fulfillment?.isDrawing())
        return 'Entered';
    } catch (error) {
      return null;
    }
    return null;
  }

  getStartDateTime(): DateTime {
    return DateTime.fromISO(this.startDateTime);
  }

  getEndDateTime(): DateTime {
    return DateTime.fromISO(this.endDateTime);
  }

  getFormattedStartDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.startDateTime));
  }

  getFormattedEndDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.endDateTime));
  }

  getCouponDate(): string {
    let incentCouponDate : string;
    if(this.fulfillment.getBonusType() === BonusType.COUPON){
      let couponDate : Interval = this.fulfillment.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null && couponDate.end === null) return '';
      if(couponDate.end !== null) {
        incentCouponDate = couponDate.end.toISO();
      } else {
        incentCouponDate = couponDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    }
    return '';
  }

  getDrawingDate(): string {
    let incentDrawingDate : string;
    if(this.fulfillment.getBonusType() === BonusType.DRWAING){
      if(this.fulfillment.getDrawingDate() === null) return '';
      if(this.fulfillment.getDrawingDate().start === null && this.fulfillment.getDrawingDate().end === null) return '';
      if(this.fulfillment.getDrawingDate().end !== null) {
        incentDrawingDate = this.fulfillment.getDrawingDate().end.toISO();
      } else {
        incentDrawingDate = this.fulfillment.getDrawingDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentDrawingDate));
    }
    return '';
  }

  getPunchDate(): string {
    let incentPunchDate : string;
    if(this.fulfillment?.getBonusType() === BonusType.PUNCH){
      if(this.fulfillment.getPunchDate() === null) return '';
      if(this.fulfillment.getPunchDate().start === null && this.fulfillment.getPunchDate().end === null) return '';
      if(this.fulfillment.getPunchDate().end !== null) {
        incentPunchDate = this.fulfillment.getPunchDate().end.toISO();
      } else {
        incentPunchDate = this.fulfillment.getPunchDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentPunchDate));
    }
    return '';
  }

  private formatDateTime(dateTime: DateTime) {
    if (!dateTime) return null;
    const datetime = dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    console.log("2.DateTime::::" + datetime);
    return datetime;
  }

  public get punch(): Punch {
    return this._punch;
  }
  public set punch(value: Punch) {
    this._punch = value;
  }

  getParentCampaign(): Fulfillment {
    return this.fulfillment;
  }

  setParentCampaign(fulfillment: Fulfillment) {
    this.fulfillment = fulfillment;
  }
}


export class SurveyData implements Persistant {
  // TODO cleanup which fields are required in constructor vs with are optional
  public redeemMethod: RedeemMethod;
  public redeemMethodAllowed: boolean;
  public redeemSource: RedeemSource;
  public campaignDescription: string;
  public canceled: boolean;

  private _punch: Punch;
  // transient
  fulfillment: Fulfillment;

  constructor(
    public databaseID: string,
    public parentID: string,
    public qrData: string,
    public redeemStatus: RedeemStatus,
    public initiateTime: number,
    public description: string,
    public org: string,
    public type: BonusType,
    public startDateTime: string,
    public endDateTime: string,
    public itemDescription: string,
    public price: string,
    public limit: string,
    public site: string,
    public location: string,
    public incentOrg: string,
    public incentDesc: string,
    public surveyQuestion: string,
    public addedTime: number
  ) { }

  getRewards(): string{
    if(this.fulfillment?.promoIDs != null && this.fulfillment?.promoIDs != undefined && this.fulfillment?.promoIDs.length > 0){
      return this.fulfillment?.promoIDs?.length.toString();
    }
    return "0";
  }

  public isCanceled(): boolean {
    return this.canceled;
  }

  public setCanceled(canceled: boolean) {
    this.canceled = canceled;
  }

  public getCustomSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return null;
  }

  public getCustomLocation(): string {
    let originalLocation: String = this.location;
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return null;
  }

  getStartDateTime(): DateTime {
    return DateTime.fromISO(this.startDateTime);
  }

  getEndDateTime(): DateTime {
    return DateTime.fromISO(this.endDateTime);
  }

  getFormattedStartDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.startDateTime));
  }

  getFormattedEndDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.endDateTime));
  }

  getCouponDate(): string {
    let incentCouponDate : string;
    if(this.fulfillment.getBonusType() === BonusType.COUPON){
      let couponDate : Interval = this.fulfillment.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null && couponDate.end === null) return '';
      if(couponDate.end !== null) {
        incentCouponDate = couponDate.end.toISO();
      } else {
        incentCouponDate = couponDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    }
    return '';
  }

  getDrawingDate(): string {
    let incentDrawingDate : string;
    if(this.fulfillment.getBonusType() === BonusType.DRWAING){
      if(this.fulfillment.getDrawingDate() === null) return '';
      if(this.fulfillment.getDrawingDate().start === null && this.fulfillment.getDrawingDate().end === null) return '';
      if(this.fulfillment.getDrawingDate().end !== null) {
        incentDrawingDate = this.fulfillment.getDrawingDate().end.toISO();
      } else {
        incentDrawingDate = this.fulfillment.getDrawingDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentDrawingDate));
    }
    return '';
  }

  getPunchDate(): string {
    let incentPunchDate : string;
    if(this.fulfillment?.getBonusType() === BonusType.PUNCH){
      if(this.fulfillment.getPunchDate() === null) return '';
      if(this.fulfillment.getPunchDate().start === null && this.fulfillment.getPunchDate().end === null) return '';
      if(this.fulfillment.getPunchDate().end !== null) {
        incentPunchDate = this.fulfillment.getPunchDate().end.toISO();
      } else {
        incentPunchDate = this.fulfillment.getPunchDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentPunchDate));
    }
    return '';
  }

  getIncentLabel(): string {
    return this.fulfillment.getIncentLabel();
  }

  getIncentStatus(): string {
    try {
      if(this.fulfillment?.isDrawing())
        return 'Entered';
    } catch (error) {
      return null;
    }
    return null;
  }

  private formatDateTime(dateTime: DateTime) {
    if (!dateTime) return null;
    const datetime = dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    // console.log("3.DateTime::::" + datetime);
    return datetime;
  }

  public get punch(): Punch {
    return this._punch;
  }
  public set punch(value: Punch) {
    this._punch = value;
  }

  getParentCampaign(): Fulfillment {
    return this.fulfillment;
  }

  setParentCampaign(fulfillment: Fulfillment) {
    this.fulfillment = fulfillment;
  }

  public getIncentiveDescription(): string {
    return this.fulfillment.getIncentiveDescription();
  }

  public getIncentOrg(): string {
    return this.fulfillment.getIncentOrg();
  }

  public getSurveySelection(): string {
    return this.fulfillment.getSurveySelection();
  }

  public getFiveStarSurveySelection(): string {
    return this.fulfillment.getFiveStarSurveySelection();
  }
}

export class FiveStarSurveyData implements Persistant {
  // TODO cleanup which fields are required in constructor vs with are optional
  public redeemMethod: RedeemMethod;
  public redeemMethodAllowed: boolean;
  public redeemSource: RedeemSource;
  public campaignDescription: string;
  public canceled: boolean;

  private _punch: Punch;
  // transient
  fulfillment: Fulfillment;

  constructor(
    public databaseID: string,
    public parentID: string,
    public qrData: string,
    public redeemStatus: RedeemStatus,
    public initiateTime: number,
    public description: string,
    public org: string,
    public type: BonusType,
    public startDateTime: string,
    public endDateTime: string,
    public itemDescription: string,
    public price: string,
    public limit: string,
    public site: string,
    public location: string,
    public incentOrg: string,
    public incentDesc: string,
    public surveyQuestion: string,
    public addedTime: number
  ) { }

  getRewards(): string{
    if(this.fulfillment?.promoIDs != null && this.fulfillment?.promoIDs != undefined && this.fulfillment?.promoIDs.length > 0){
      return this.fulfillment?.promoIDs?.length.toString();
    }
    return "0";
  }

  public isCanceled(): boolean {
    return this.canceled;
  }

  public setCanceled(canceled: boolean) {
    this.canceled = canceled;
  }

  public getCustomSite(): string {
    let originalSite: String = this.site;
    if (!!originalSite) {
      if (originalSite.charAt(0) == '~') {
        return originalSite.substring(1);
      }
    }
    return null;
  }

  public getCustomLocation(): string {
    let originalLocation: String = this.location;
    if (!!originalLocation) {
      if (originalLocation.charAt(0) == '~') {
        return originalLocation.substring(1);
      }
    }
    return null;
  }

  getStartDateTime(): DateTime {
    return DateTime.fromISO(this.startDateTime);
  }

  getEndDateTime(): DateTime {
    return DateTime.fromISO(this.endDateTime);
  }

  getFormattedStartDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.startDateTime));
  }

  getFormattedEndDateTime(): string {
    return this.formatDateTime(DateTime.fromISO(this.endDateTime));
  }

  getCouponDate(): string {
    let incentCouponDate : string;
    if(this.fulfillment.getBonusType() === BonusType.COUPON){
      let couponDate : Interval = this.fulfillment.getCouponDate();
      if(couponDate === null) return '';
      if(couponDate.start === null && couponDate.end === null) return '';
      if(couponDate.end !== null) {
        incentCouponDate = couponDate.end.toISO();
      } else {
        incentCouponDate = couponDate.start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentCouponDate));
    }
    return '';
  }

  getDrawingDate(): string {
    let incentDrawingDate : string;
    if(this.fulfillment.getBonusType() === BonusType.DRWAING){
      if(this.fulfillment.getDrawingDate() === null) return '';
      if(this.fulfillment.getDrawingDate().start === null && this.fulfillment.getDrawingDate().end === null) return '';
      if(this.fulfillment.getDrawingDate().end !== null) {
        incentDrawingDate = this.fulfillment.getDrawingDate().end.toISO();
      } else {
        incentDrawingDate = this.fulfillment.getDrawingDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentDrawingDate));
    }
    return '';
  }

  getPunchDate(): string {
    let incentPunchDate : string;
    if(this.fulfillment?.getBonusType() === BonusType.PUNCH){
      if(this.fulfillment.getPunchDate() === null) return '';
      if(this.fulfillment.getPunchDate().start === null && this.fulfillment.getPunchDate().end === null) return '';
      if(this.fulfillment.getPunchDate().end !== null) {
        incentPunchDate = this.fulfillment.getPunchDate().end.toISO();
      } else {
        incentPunchDate = this.fulfillment.getPunchDate().start.toISO();
      }
      return this.formatDateTime(DateTime.fromISO(incentPunchDate));
    }
    return '';
  }

  getIncentLabel(): string {
    return this.fulfillment.getIncentLabel();
  }

  getIncentStatus(): string {
    try {
      if(this.fulfillment?.isDrawing())
        return 'Entered';
    } catch (error) {
      return null;
    }
    return null;
  }

  private formatDateTime(dateTime: DateTime) {
    if (!dateTime) return null;
    return dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  public get punch(): Punch {
    return this._punch;
  }
  public set punch(value: Punch) {
    this._punch = value;
  }

  getParentCampaign(): Fulfillment {
    return this.fulfillment;
  }

  setParentCampaign(fulfillment: Fulfillment) {
    console.log("0.Fullfillment: " + this.fulfillment);
    this.fulfillment = fulfillment;
  }

  public getIncentiveDescription(): string {
    return this.fulfillment.getIncentiveDescription();
  }

  public getIncentOrg(): string {
    return this.fulfillment.getIncentOrg();
  }

  public getSurveySelection(): string {
    return this.fulfillment.getSurveySelection();
  }

  // public getFiveStarSurveySelection(): string {
  //   console.log("1.Fullfillment: " + this.fulfillment);
  //   let surveySelection : string = this.fulfillment.getFiveStarSurveySelection();
  //   console.log("surveySelection: " + surveySelection);
  //   return surveySelection;
  // }
}

//
//  SYSTEM
//
export class SystemSettings implements Persistant {
  constructor(
    public databaseID: string,
    public timeout: number,
    public readerID: string,
    public defaults?: boolean,
  ) { }

}

export enum Branch {
  TESTING = 'Testing',
  PRODUCTION = 'Production'
}

@Injectable({
  providedIn: 'root'
})
export class ModelService {

  public allowDuplicates: boolean = false;
  public compositeMode: boolean = true;
  public showPush = false;
  public emailDebug = false;

  public sfa: boolean = true;
  public fcmToken: string;

  //
  //  VERSION
  //
  public static version: string = '0.3.24.0';
  public static updated: string = '03/29/22';
  public static branch: Branch = Branch.TESTING;

  constructor() {
    console.log('running in ' + (this.sfa ? 'SFA' : 'eRedeem') + 'mode');
  }

}
