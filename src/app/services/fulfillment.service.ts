import { Injectable } from '@angular/core';
import { Calendar } from '@ionic-native/calendar/ngx';
import { DatabaseService, Domain } from './database.service';
import { MessagingService, Queue, QueueName } from './messaging.service';
import { EmailTask, FFData, Fulfillment, Promo, PromoGenTask, Symbol, SymbolType, Task, TaskStatus, TaskType, FFAction, FFState, Composite, InputSymbol, PromoType, Part, RestPostTask, RedeemStatus, RedeemMethod, CancelState, EngageType } from './model.service';
import { ModelService } from './model.service';
import { SymbologyService } from './symbology.service';
import { AlertController } from '@ionic/angular';


import { DateTime } from 'luxon';

interface UserCodeElement {
  code: string,
  required: boolean
}

@Injectable({
  providedIn: 'root'
})
export class FulfillmentService {

  //messaging
  private queue: Queue<Fulfillment>;

  constructor(
    private database: DatabaseService,
    private messaging: MessagingService,
    private symbology: SymbologyService,
    private calendar: Calendar,
    private alertController: AlertController,
    private model: ModelService,
  ) {
    this.queue = this.messaging.getQueue(QueueName.FULFILLMENT);
    this.queue.getObservable().subscribe((f: Fulfillment) => {
      if (!f) {
        //this.loadSummaries();
        return;
      }
      console.log('New fulfillment received:');
      //console.table(f);
      this.processFulfillment(f);
    });
    console.log('fulfillment service running');
  }

  public makeInputSymbols<T>(type: SymbolType, ffData: FFData[], editMode?: boolean): InputSymbol<T>[] {
    return ffData
      .filter((d: FFData) => d.type === type)
      .map((d: FFData) => {
        let s: InputSymbol<T> = this.symbology.getSymbol(type, d.code);
        if (d.parts) {
          d.parts.forEach(dPart => s.parts.find(p => p.code === dPart.code).value = dPart.value);
          if (s.code === '_email' || s.code === '_phone') {
            console.log('ffData:');
            console.table(d);
            s.parts.forEach(p => p.skip = !d.parts.some(dP => dP.code === p.code));
          }
        }
        if (d.composites) {
          d.composites.forEach(dComp => s.composites.find(c => c.code === dComp.code).required = dComp.required);
        }
        return s;
      }).filter(s => { //only show required composites
        return !!editMode || s.composites.some(comp => comp.required);
      }).filter(s => {
        return !!editMode || s.parts.some(part => !part.value);
      });
  }

  //Create ffdata from qrData and database
  public async initializeFFData(ff: Fulfillment): Promise<Fulfillment> {
    if (!!ff.ffData) {
      console.log('ff data already initialized')
      return null;
    }

    console.log('qr Data: ' + ff.qrData);
    let qrSymbols: Symbol<SymbolType.QRCode>[] = this.symbology.parseQrSymbols(ff.qrData);
    console.log('qr symbols: ' + qrSymbols);
    if (!qrSymbols) {
      console.log('no qr symbols found in: ' + ff.qrData);
      return null;
    }
    let ffData: FFData[] = [];

    for (let i = 0; i < qrSymbols.length; i++) {
      const qrSymbol: Symbol<SymbolType.QRCode> = qrSymbols[i];
      const qCode: string = qrSymbol.code;
      switch (qCode) {
        //add SymbolType.User to ff
        case 'U':  //user
          let userFFData: FFData[] = [];
          let requestedComposites: UserCodeElement[] = this.parseUserCodeElements(qrSymbol.parts[0].value);
          console.log('requested user composites for this scan: ');
          console.table(requestedComposites);

          //let phonePref: boolean = requestedComposites.some(c => c.code === '8');
          let phoneFallback: UserCodeElement;
          //let emailPref: boolean = requestedComposites.some(c => c.code === '9');
          let emailFallback: UserCodeElement;

          for (let i = 0; i < requestedComposites.length; i++) {
            const c = requestedComposites[i];
            let symbol: Symbol<SymbolType.User> = this.symbology.getSymbolByCompositeCode<SymbolType.User>(SymbolType.User, c.code);

            if (!symbol) {
              console.table("can't find symbol for composite: " + c.code);
              continue;
            }

            //handle preferred fields later
            if (symbol.code === '_phone') {
              if (c.code !== '8') phoneFallback = c;
              continue;
            }
            if (symbol.code === '_email') {
              if (c.code !== '9') emailFallback = c;
              continue;
            }

            symbol = await this.database.loadSymbolValues<Symbol<SymbolType.User>>(symbol);

            let ffDataParts = symbol.parts
              .map(part => {
                return {
                  code: part.code,
                  value: part.value
                }
              });

            let ffData: FFData = userFFData.find(data => data.type === SymbolType.User && data.code === symbol.code);

            if (!!ffData) { //ff data element for this symbol exists
              ffData.composites.push(c);
              ffData.parts = ffData.parts.concat(ffDataParts.filter(dP => !ffData.parts.some(p => p.code === dP.code)));

            } else { //ff data element for this symbol DNE yet
              userFFData.push({
                type: SymbolType.User,
                code: symbol.code,
                parts: ffDataParts,
                composites: [c]
              });
            }
          }

          //handle preferred fields
          if (!!emailFallback) {
            userFFData.push(await this.processPref('_email', '9', emailFallback));
          }
          if (!!phoneFallback) {
            userFFData.push(await this.processPref('_phone', '8', phoneFallback));
          }

          ffData = ffData.concat(userFFData);
          // console.log('userFFData:');
          // console.table(userFFData);

          break;

        //add SymbolType.Action and action options
        case 'A': //action
          let actionQRData: string = qrSymbol.parts[0].value;
          console.log('actionQRData:' + actionQRData);
          ffData.push({ //action
            type: SymbolType.Action,
            code: actionQRData.substring(0, 1),
          });
          if (actionQRData.length > 1) { //options
            let actionOptions: FFData[] = this.parseActionOptions(actionQRData.substring(1));
            if (!!actionOptions) ffData = ffData.concat(actionOptions);
          }
          break;

        //add SymbolType.Programmatic
        case 'O': //survey
          let options: { code: string, value: string }[] = [];
          qrSymbol.parts[0].value.replace(/(\r\n\t|\n|\r\t)/gm, '').split('☻') // <- SURVEY OPTIONS DELIMITER
            .forEach((o: string, i: number) => options.push({ code: String(i), value: o }));

          ffData.push({
            type: SymbolType.QRCode,
            code: qCode,
            parts: options
          })

          ffData.push({
            type: SymbolType.Programmatic,
            code: qCode,
            parts: [],
          });
          break;

        //add SymbolType.QRCode
        case 'C': //campaign id
        case 'F': //promo id
        case 'D': //description
        case 'S': //org/sponsor
        case 'P': //org/provider
        case 'I': //item description
        case 'p': //price
        case 'm': //max quantity
        case 'G': //email
        case 'K': //remote clock mode
        case 'R': //url
        case '1': //start
        case '2': //end
        case '3': //summary
        case '4': //geolocation
        case 'e': //eventSite
        case 'l': //eventLocation
        case 'L': //scanLocationID
        case 'Z': //contentItemID
        case 'd': //incentive description
        // case '2S': //sfa start
        // case '2E': //sfa end
        case '9E': //event window
        // case '0S': //eRedeem start
        // case '0E': //eRedeem end
        case '9F': //eRedeem window
        case '9r': //eRedeem window
        // case '0T': //eRedeem rel start
        // case '0F': //eRedeem rel end
        case '0E': //eRedeem rel window
        case '0r': //eRedeem rel window
        // case '1S': //camp start
        // case '1E': //camp end
        case '9C': //campaign window
        case 'N': //max guests
        case '7': // incentive redeem type
        case 't': // reward redeem type
        case 'c': //punches needed
        case 'W': //max Loyalty ePunch cards
        case 'V': //punches starter
        case 'd': //punch incentive description
        case 's': //punch incentive sponsor
        // case '0s': //punch redeem start
        // case '0e': //punch redeem end
        case '9d': // incent drawing date
        case '9i': //Incent Punch Window
        case '9r': // Incent Redeem Window
        case 'e': // Incent site
        case 'l': // Incent Location
        case 'p': // Incent Price
        case 'm': // Incent Item Limit
        case 'i': // Incentive Item Description
        case 'a': // Call to Action Text
        case 'j': // Reward Redeem Site
        case 'k': // Reward Redeem Location
        case '9R': //punch redeem window
        case '0R': //punch relative redeem window
          ffData.push({
            type: SymbolType.QRCode,
            code: qCode,
            parts: [{
              code: qCode,
              value: qrSymbol.parts[0].value,
            }]
          });
          break;
        default:
          console.log('unknown qr code: ' + qCode);
          break;
      }
    }

    //device id
    ffData.push({
      type: SymbolType.Programmatic,
      code: 'I',
      parts: [{
        code: 'I',
        value: ff.deviceID
      }]
    });

    //scan time
    ffData.push({
      type: SymbolType.Programmatic,
      code: 'T',
      parts: [{
        code: 'T',
        value: String(ff.scanTime)
      }]
    });

    ff.ffData = ffData;

    return ff;
  }

  private parseUserCodeElements(uCode: string): UserCodeElement[] {
    let elements: UserCodeElement[] = [];
    let required = true;

    for (let j = 0; j < uCode.length; j++) {
      const code: string = uCode[j];
      if (code === "*") {
        required = false;
        continue;
      }
      elements.push({
        code: code,
        required: required
      });
    }
    return elements;
  }

  private parseActionOptions(actionOptions: string): FFData[] {
    let ffData: FFData[] = []
    let i = 0;
    while (i < actionOptions.length) {
      let optionCode: string = actionOptions[i];

      //look for (upcoming) '<value>' substr
      let optionValue: string;
      if ((actionOptions.length > i + 2) && actionOptions[i + 1] == "<") {
        let endIndex: number = actionOptions.indexOf(">", i);
        let optionValueLen: number = (i + 1) - endIndex;
        optionValue = actionOptions.substr(i + 1, optionValueLen);
        i = endIndex;
      }

      let data: FFData = {
        type: SymbolType.ActionOption,
        code: optionCode,
      }
      switch (optionCode) {
        case 'w':
        case 'e':
          if (!!optionValue) {
            data.parts = [{
              code: optionCode,
              value: optionValue
            }];
          }
          break;
        default:
          break;
      }
      ffData.push(data);
      i++;
    }

    return ffData;
  }

  private async processPref(symbolCode: string, prefCode: string, fallback: UserCodeElement): Promise<FFData> {
    let ffData: FFData;
    let symbol: Symbol<SymbolType.User> = this.symbology.getSymbol<Symbol<SymbolType.User>>(SymbolType.User, symbolCode);
    symbol = await this.database.loadSymbolValues<Symbol<SymbolType.User>>(symbol);
    let prefPart: Part = symbol.parts.find(p => p.code === symbol.parts.find(p => p.code === prefCode).value);
    let foundPref: boolean = false;
    if (!!prefPart) {
      if (!!prefPart.value) {
        //add pref data to userdata
        //create custom composite
        ffData = {
          type: SymbolType.User,
          code: symbolCode,
          parts: [{ code: prefPart.code, value: prefPart.value }],
          composites: [{ code: prefPart.code, required: fallback.required }]
        };
        foundPref = true;
      }
    }
    if (!foundPref) { //pref not set or valid
      //try to use fallback
      //use provided fallback composite
      let fallbackPart: Part = symbol.parts.find(p => p.code === fallback.code);
      ffData = {
        type: SymbolType.User,
        code: symbolCode,
        parts: [{ code: fallbackPart.code, value: fallbackPart.value }],
        composites: [fallback]
      };
    }
    return ffData;
  }

  public addFulfillment(ff: Fulfillment) {
    if (!ff.databaseID) ff.databaseID = this.database.generateID(Domain.FULFILLMENT);
    if (!ff.tasks) {
      let tasks: Task[] = [];

      //destination tasks
      const emailData = ff.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'G');
      if (!!emailData) tasks.push(new EmailTask(emailData.parts[0].value, TaskStatus.IN_PROGRESS));

      const urlData = ff.ffData.find(d => d.type === SymbolType.QRCode && d.code === 'R');
      if (!!urlData) tasks.push(new RestPostTask(urlData.parts[0].value, TaskStatus.IN_PROGRESS));

      //if action is promo (ePromo->eCoupon) or actionOptions contains 't' (event w eTicket)
      const promoActionData = ff.ffData.find(d => d.type === SymbolType.Action && d.code === 'Q');
      const promoOptionData = ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'c');
      const drawingnData = ff.ffData.find(d => d.type === SymbolType.ActionOption && d.code === 'd');
      

      if (!!drawingnData) {
        let promoQRData = this.makePromoQrData(ff);
        let promoID = this.database.generateIDNew(Domain.PROMO,0);
        ff.promoIDs.push(promoID);
        if (!!drawingnData) tasks.push(new PromoGenTask(PromoType.DRWAING, promoID, promoQRData, TaskStatus.IN_PROGRESS));
      }

      if (!!promoOptionData) {
        let promoQRData = this.makePromoQrData(ff);
        let promoID = this.database.generateIDNew(Domain.PROMO,0);
        ff.promoIDs.push(promoID);
        if (!!promoOptionData) tasks.push(new PromoGenTask(PromoType.COUPON, promoID, promoQRData, TaskStatus.IN_PROGRESS));
        // if (!!eTicketOptionData) tasks.push(new PromoGenTask(PromoType.TICKET, promoID, promoQRData, TaskStatus.IN_PROGRESS));
      }

      if (!!promoActionData) {
        let promoQRData = this.makePromoQrData(ff);
        let promoID = this.database.generateIDNew(Domain.PROMO,1);
        ff.promoIDs.push(promoID);
        if (!!promoActionData) tasks.push(new PromoGenTask(PromoType.COUPON, promoID, promoQRData, TaskStatus.IN_PROGRESS));
        // if (!!eTicketOptionData) tasks.push(new PromoGenTask(PromoType.TICKET, promoID, promoQRData, TaskStatus.IN_PROGRESS));
      }

      //todo other tasks go here

      ff.tasks = tasks;
    }
    this.queue.publish(ff);

  }

  public makePromoQrData(ff: Fulfillment): string {

    let parts = [
      { code: 'T', key: '♥5', type: SymbolType.Programmatic },
      { code: 'I', key: '♥6', type: SymbolType.Programmatic },
      { code: 'C', key: '♥C', type: SymbolType.QRCode },
      { code: 'D', key: '♥D', type: SymbolType.QRCode },
      { code: 'S', key: '♥S', type: SymbolType.QRCode },
      { code: 'P', key: '♥P', type: SymbolType.QRCode },
      { code: 'F', key: '♥F', type: SymbolType.QRCode },
      { code: 'M', key: '♥M', type: SymbolType.QRCode },
      { code: 'R', key: '♥R', type: SymbolType.QRCode },
      { code: 'G', key: '♥G', type: SymbolType.QRCode },
      // { code: '0S', key: '♥0S', type: SymbolType.QRCode },
      // { code: '0E', key: '♥0E', type: SymbolType.QRCode },
      { code: '9F', key: '♥9F', type: SymbolType.QRCode },
      { code: '9r', key: '♥9r', type: SymbolType.QRCode },
      // { code: '0T', key: '♥0T', type: SymbolType.QRCode },
      // { code: '0F', key: '♥0F', type: SymbolType.QRCode },
      { code: '0E', key: '♥0E', type: SymbolType.QRCode },
      { code: '0r', key: '♥0r', type: SymbolType.QRCode },
      { code: '1S', key: '♥1S', type: SymbolType.QRCode },
      { code: '1E', key: '♥1E', type: SymbolType.QRCode },
      { code: '9C', key: '♥9C', type: SymbolType.QRCode},
      // { code: '2S', key: '♥2S', type: SymbolType.QRCode },
      // { code: '2E', key: '♥2E', type: SymbolType.QRCode },
      { code: '9E', key: '♥9E', type: SymbolType.QRCode },
      { code: 'c', key: '♥c', type: SymbolType.QRCode },
      { code: 'W', key: '♥W', type: SymbolType.QRCode },
      { code: 'V', key: '♥V', type: SymbolType.QRCode },
      { code: 'd', key: '♥d', type: SymbolType.QRCode },
      { code: 's', key: '♥s', type: SymbolType.QRCode },
      { code: '7', key: '♥7', type: SymbolType.QRCode },
      // { code: '0s', key: '♥0s', type: SymbolType.QRCode },
      // { code: '0e', key: '♥0e', type: SymbolType.QRCode },
      { code: '9R', key: '♥9R', type: SymbolType.QRCode },
      { code: '0R', key: '♥0R', type: SymbolType.QRCode },
    ];

    let qrData: string = "AR";

    parts.forEach(p => {
      let ffData: FFData = ff.ffData.find(s => s.type === (p.type as SymbolType) && s.code === p.code);
      if (!!ffData) {
        let value = ffData.parts[0].value;
        if (value != null && value != undefined) {
          qrData += p.key + value;
        }
      }
    });

    return qrData;

  }

  public makeEventWithGuestQrData(ff: Fulfillment): string {

    let parts = [
      { code: 'T', key: '♥5', type: SymbolType.Programmatic },
      { code: 'I', key: '♥6', type: SymbolType.Programmatic },
      { code: 'C', key: '♥C', type: SymbolType.QRCode },
      { code: 'D', key: '♥D', type: SymbolType.QRCode },
      { code: 'S', key: '♥S', type: SymbolType.QRCode },
      { code: 'P', key: '♥P', type: SymbolType.QRCode },
      { code: 'F', key: '♥F', type: SymbolType.QRCode },
      { code: 'M', key: '♥M', type: SymbolType.QRCode },
      { code: 'R', key: '♥R', type: SymbolType.QRCode },
      { code: 'G', key: '♥G', type: SymbolType.QRCode },
      // { code: '0S', key: '♥0S', type: SymbolType.QRCode },
      // { code: '0E', key: '♥0E', type: SymbolType.QRCode },
      { code: '9F', key: '♥9F', type: SymbolType.QRCode },
      { code: '9r', key: '♥9r', type: SymbolType.QRCode },
      // { code: '0T', key: '♥0T', type: SymbolType.QRCode },
      // { code: '0F', key: '♥0F', type: SymbolType.QRCode },
      { code: '0E', key: '♥0E', type: SymbolType.QRCode },
      { code: '0r', key: '♥0r', type: SymbolType.QRCode },
      { code: '1S', key: '♥1S', type: SymbolType.QRCode },
      { code: '1E', key: '♥1E', type: SymbolType.QRCode },
      { code: '9C', key: '♥9C', type: SymbolType.QRCode},
      // { code: '2S', key: '♥2S', type: SymbolType.QRCode },
      // { code: '2E', key: '♥2E', type: SymbolType.QRCode },
      { code: '9E', key: '♥9E', type: SymbolType.QRCode },
      { code: 'c', key: '♥c', type: SymbolType.QRCode },
      { code: 'W', key: '♥W', type: SymbolType.QRCode },
      { code: 'V', key: '♥V', type: SymbolType.QRCode },
      { code: 'd', key: '♥d', type: SymbolType.QRCode },
      { code: 's', key: '♥s', type: SymbolType.QRCode },
      { code: '7', key: '♥7', type: SymbolType.QRCode },
      // { code: '0s', key: '♥0s', type: SymbolType.QRCode },
      // { code: '0e', key: '♥0e', type: SymbolType.QRCode },
      { code: '9R', key: '♥9R', type: SymbolType.QRCode },
      { code: '0R', key: '♥0R', type: SymbolType.QRCode },
    ];

    let qrData: string = "AR";

    parts.forEach(p => {
      let ffData: FFData = ff.ffData.find(s => s.type === (p.type as SymbolType) && s.code === p.code);
      if (!!ffData) {
        let value = ffData.parts[0].value;
        if (value != null && value != undefined) {
          qrData += p.key + value;
        }
      }
    });

    return qrData;

  }

  public makeSurveyQrData(ff: Fulfillment): string {

    let parts = [
      { code: 'T', key: '♥5', type: SymbolType.Programmatic },
      { code: 'I', key: '♥6', type: SymbolType.Programmatic },
      { code: 'C', key: '♥C', type: SymbolType.QRCode },
      { code: 'D', key: '♥D', type: SymbolType.QRCode },
      { code: 'S', key: '♥S', type: SymbolType.QRCode },
      { code: 'P', key: '♥P', type: SymbolType.QRCode },
      { code: 'F', key: '♥F', type: SymbolType.QRCode },
      { code: 'M', key: '♥M', type: SymbolType.QRCode },
      { code: 'R', key: '♥R', type: SymbolType.QRCode },
      { code: 'G', key: '♥G', type: SymbolType.QRCode },
      // { code: '0S', key: '♥0S', type: SymbolType.QRCode },
      // { code: '0E', key: '♥0E', type: SymbolType.QRCode },
      { code: '9F', key: '♥9F', type: SymbolType.QRCode },
      { code: '9r', key: '♥9r', type: SymbolType.QRCode },
      // { code: '0T', key: '♥0T', type: SymbolType.QRCode },
      // { code: '0F', key: '♥0F', type: SymbolType.QRCode },
      { code: '0E', key: '♥0E', type: SymbolType.QRCode },
      { code: '0r', key: '♥0r', type: SymbolType.QRCode },
      { code: '1S', key: '♥1S', type: SymbolType.QRCode },
      { code: '1E', key: '♥1E', type: SymbolType.QRCode },
      { code: '9C', key: '♥9C', type: SymbolType.QRCode},
      // { code: '2S', key: '♥2S', type: SymbolType.QRCode },
      // { code: '2E', key: '♥2E', type: SymbolType.QRCode },
      { code: '9E', key: '♥9E', type: SymbolType.QRCode },
      { code: 'c', key: '♥c', type: SymbolType.QRCode },
      { code: 'W', key: '♥W', type: SymbolType.QRCode },
      { code: 'V', key: '♥V', type: SymbolType.QRCode },
      { code: 'd', key: '♥d', type: SymbolType.QRCode },
      { code: 's', key: '♥s', type: SymbolType.QRCode },
      { code: '7', key: '♥7', type: SymbolType.QRCode },
      // { code: '0s', key: '♥0s', type: SymbolType.QRCode },
      // { code: '0e', key: '♥0e', type: SymbolType.QRCode },
      { code: '9R', key: '♥9R', type: SymbolType.QRCode },
      { code: '0R', key: '♥0R', type: SymbolType.QRCode },
    ];

    let qrData: string = "AR";

    parts.forEach(p => {
      let ffData: FFData = ff.ffData.find(s => s.type === (p.type as SymbolType) && s.code === p.code);
      if (!!ffData) {
        let value = ffData.parts[0].value;
        // console.log("ffData value:: " + value);
        if (value != null && value != undefined) {
          qrData += p.key + value;
        }
      }
    });

    return qrData;

  }

  public dateToHumanReadable(dateTime: DateTime): string {
    if (!dateTime) return null;
    return dateTime.toFormat('EEE MMM dd yyyy hh:mm a').toLocaleString({ weekday: 'short', month: 'short', year: 'numeric', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  private async processFulfillment(fulfillment: Fulfillment): Promise<void> {

    console.log('processing fulfillment:');
    console.table(fulfillment.ffData);

    // todo why is process fulfillment saving at the beginning of the function as well?
    if (fulfillment.ffAction != FFAction.LOST) {
      await this.database.saveFF(fulfillment);
    }

    //build json object payload from ff
    let payload: any = {};

    if (window["plugins"]) {
      // await this.firebase.getToken().then(token => {
      // (<any>window).FirebasePlugin.getToken().then(token => {
      //   payload['to'] = token;
      // });
      // let tokenPromise = () => new Promise(async resolve => {
      //   (<any>window).FirebasePlugin.getToken(token => {
      //     resolve(token);
      //   })
      // });

      // payload['to'] = await tokenPromise();
      payload['to'] = this.model.fcmToken;
    }

    // setup header information ahead of time to anchor order
    if (fulfillment.ffAction === FFAction.REGISTER) {
      payload['Trans_Type'] = '';
      payload['Rdr_ID'] = '';
      payload['Trans_Time'] = '';
      payload['Reg_Time'] = '';
      // payload['Media_Scan_Loc'] = '';
      // payload['Site_ID'] = '';
      // payload['Loc_ID'] = '';
      // payload['Media_Type'] = '';
    } else {
      payload['Trans_Type'] = '';
      payload['Rdr_ID'] = '';
      payload['Trans_Time'] = '';
      payload['Reg_Time'] = '';
    }



    switch (fulfillment.ffAction) {
      case FFAction.REGISTER:
        payload['Trans_Type'] = 'R';
        break;
      case FFAction.UPDATE:
        payload['Trans_Type'] = 'U';
        break;
      case FFAction.REDEEM:
        payload['Trans_Type'] = 'P';
        break;
      case FFAction.CANCEL:
        payload['Trans_Type'] = 'C';
        break;
      case FFAction.ACTIONABLE:
        payload["Trans_Type"] = 'A';
        payload["Engage_Data"] = { "Response" : fulfillment.getActionResponse() };
        break;
      case FFAction.LOST:
        payload["Trans_Type"] = 'L';
        break;
      case FFAction.PUNCH_CHECK_IN:
        payload["Trans_Type"] = 'PC';
        payload["Engage_Data"] = { "ePunch_Check_In" : fulfillment.getActionResponse() };
        break;
      case FFAction.PUNCH_REWARD:
        payload["Trans_Type"] = 'W';
        payload["Engage_Data"] = { "ePunch_Card_Num" : fulfillment.getActionResponse() };
        break;
      case FFAction.PUNCH_ORPHAN:
        payload["Trans_Type"] = 'N';
        payload["Engage_Data"] = { "ePunch_Num" : fulfillment.getActionResponse() };
        break;
      case FFAction.REOPEN:
        payload["Trans_Type"] = 'OP';
        break;
      default:
        console.log("Unexpected ffaction: " + fulfillment.ffAction);
        break;
    }
    if (fulfillment.getRemoteClockMode() === false) {
      payload['Trans_Time'] = DateTime.local().toFormat("yyLLdd'T'hhmma");
    } else {
      payload['Trans_Time'] = DateTime.utc().toFormat("yyLLdd'T'hhmma");
    }

    switch (fulfillment.ffAction) {
      case FFAction.REGISTER:
        // let scanLocString = fulfillment.ffData.find(s => s.code === 'L').parts[0].value;
        // let parsedScanLoc = this.symbology.parseScanLocation(scanLocString);
        // payload['Media'] = parsedScanLoc.mediaType;
        // payload['Site'] = parsedScanLoc.siteId;
        // payload['Site_Loc'] = parsedScanLoc.locationId;

        //     this.scanLocation = {campusId, siteId, locationId, mediaType};        
        let scanLocation = fulfillment.getScanLocation();
        if (scanLocation) {
          payload['Media'] = scanLocation.mediaType;
          payload['Campus'] = scanLocation.campusId;
          payload['Site'] = scanLocation.siteId;
          payload['Loc'] = scanLocation.locationId;
        }
        break;
      case FFAction.PUNCH_CHECK_IN:
      case FFAction.PUNCH_REWARD:
      case FFAction.REOPEN:
      case FFAction.PUNCH_ORPHAN:
        let punchPromo: Promo = await this.database.loadPromo(fulfillment.getPunchID());
        if (punchPromo) {
          if (punchPromo.site) {
            payload['Site'] = punchPromo.site;
          }
          if (punchPromo.location) {
            payload['Site_Loc'] = punchPromo.location;
          }
        }
        break;
    }

    // if (fulfillment.ffAction === FFAction.REGISTER) {
    //   let scanLocString = fulfillment.ffData.find(s => s.code === 'L').parts[0].value;
    //   let parsedScanLoc = this.symbology.parseScanLocation(scanLocString);
    //   payload['Media'] = parsedScanLoc.mediaType;
    //   payload['Site'] = parsedScanLoc.siteId;
    //   payload['Site_Loc'] = parsedScanLoc.locationId;
    //   // payload['Media_Type'] = parsedScanLoc.mediaType;
    //   // payload['Media_Scan_Loc'] = scanLocString;
    // }

    //add programmatic data to payload
    fulfillment.ffData
      .filter(d => d.type === SymbolType.Programmatic)
      .forEach(d => {
        let symbol: Symbol<any> = this.symbology.getSymbol(d.type, d.code);

        let part = d.parts.find(part => part.code === symbol.code && !!part.value);
        if (!!part) {
          let key: string = symbol.parts.find(p => p.code === part.code).jsonKey;
          let value: string = part.value;
          if (d.code === 'T' && fulfillment.getRemoteClockMode() === false) {
            value = DateTime.fromISO(value).setZone('local').toFormat("yyLLdd'T'hhmma");
          }
          payload[key] = value;          
        }
      });

    if (fulfillment.ffAction === FFAction.REGISTER) {
      // add user data
      let userData: any = {}
      this.registerPayload(fulfillment, userData);
      if (Object.keys(userData).length != 0) {
        payload["User_Profile_Data"] = userData;
      }
    }

    if (fulfillment.ffAction !== FFAction.REGISTER && fulfillment.ffAction !== FFAction.UPDATE) {
      delete payload['Survey_Sel'];
    } else if (payload["Survey_Sel"]) {
      payload["Engage_Data"] = { "Choice" : payload["Survey_Sel"]};
      delete payload['Survey_Sel'];
    }

    if (fulfillment.getEngageType() === EngageType.EVENT_WITH_GUEST &&
      (fulfillment.ffAction === FFAction.REGISTER || fulfillment.ffAction === FFAction.UPDATE)) {
      payload["Engage_Data"] = { "Guests" : fulfillment.getGuests() };
    }

    if (fulfillment.ffAction != FFAction.LOST) {
      payload["Context"] = {
        "Camp_ID": fulfillment.getCampaignID(),
        "Engage_Type": fulfillment.getEngageType(),
        "Engage_ID": fulfillment.databaseID
      }
    }
    if (fulfillment.isPromo() && fulfillment.ffAction != FFAction.LOST) {
      payload["Context"]["Redeem_ID"] =  fulfillment.promoIDs;
    }

    const payloadStr: string = JSON.stringify(payload);
    console.log('payload: ' + payloadStr);
    console.log(JSON.stringify(payload, null, 2));
    fulfillment.getEngageType();
    

    //todo sort tasks so rest_post is done before promo_gen

    // console.log('tasks:');
    // console.table(fulfillment.tasks);

    for (let task of fulfillment.tasks) {
      let status: TaskStatus = task.status as TaskStatus;
      if (status === TaskStatus.COMPLETE && fulfillment.ffAction === FFAction.REGISTER) continue;

      //payload.testing_delay = 4000;

      fulfillment.processedTime = Date.now();

      switch (task.type) {
        case TaskType.EMAIL: {
          console.log('send email task');

          // set status to redeemed for associated promo
          if (fulfillment.isPromo && fulfillment.ffAction === FFAction.REDEEM) {
            let promos = this.database.loadPromos();
            let filteredPromos = (await promos).filter((promo) => {
              return promo.parentID === fulfillment.databaseID;
            });
            filteredPromos.forEach(filteredPromo => {
              filteredPromo.redeemStatus = RedeemStatus.REDEEMED;
              this.database.savePromo(filteredPromo);
            })
          }

          let emailTask = task as EmailTask;
          task.status = TaskStatus.IN_PROGRESS;
          await this.taskSendEmail(emailTask.emailAddr, '*Campaign*:' + fulfillment.getCampaignID(),
            payloadStr)
            .then(() => {
              task.status = TaskStatus.COMPLETE;
            })
            .catch(() => {
              task.status = TaskStatus.FAILED;
              console.log("Email task failed");
              if (fulfillment.ffAction == FFAction.REGISTER) {
                this.displayFailure();
              }
            });
          break;
        }
        case TaskType.REST_POST: {
          console.log('rest post task');
          let restTask = task as RestPostTask;
          task.status = TaskStatus.IN_PROGRESS;

          await this.httpRequest('POST', restTask.url, payloadStr, this.model.emailDebug)
            .then(async resolve => {
              console.log("http resolve: " + resolve);
            }, reject => {
              task.status = TaskStatus.FAILED;
            })
            .catch(e => {
              console.log('httpRe error')
              task.status = TaskStatus.FAILED;
            });
          break;
        }
        case TaskType.GENERATE_PROMO: {
          console.log('gen promo code task');
          //todo this should only run after and if rest_post is sucessful
          if (fulfillment.ffAction !== FFAction.REGISTER) break;
          let promoGenTask = task as PromoGenTask;
          task.status = TaskStatus.IN_PROGRESS;

          let promo: Promo = this.database.generatePromo(fulfillment, promoGenTask.databaseID, promoGenTask.promoQRData, promoGenTask.promoType);

          await this.database.savePromo(promo);
          task.status = TaskStatus.COMPLETE;

          break;
        }
        default: {
          break;
        }
      }
    }

    switch (fulfillment.ffAction) {
      case FFAction.REGISTER:
        // fulfillment.state = FFState.REGISTERED;
        if (fulfillment.getRedeemMethod() == RedeemMethod.QUICK) {
          fulfillment.state = FFState.REGISTERED;
        } else {
          fulfillment.state = FFState.SUBMITTED;
        }
        // if task failed, overwrite state to pending
        fulfillment.tasks.forEach(task => {
          if (task.status == TaskStatus.FAILED) {
            fulfillment.state = FFState.PENDING;
          }
        });
        break;
      case FFAction.DELETE:
        fulfillment.state = FFState.DELETED;
        break;
      case FFAction.CANCEL:
        fulfillment.setCancelState(CancelState.SUBMITTED);
        break;
    }

    let save: boolean = fulfillment.ffAction != FFAction.LOST;
    fulfillment.ffAction = null;
    fulfillment.updateStatus();

    if (save) {
      await this.database.saveFF(fulfillment);
    }
  }

  private registerPayload(fulfillment: Fulfillment, payload: any) {
    //add user data to payload
    console.log("Register Payload");
    const qrSymbols: Symbol<SymbolType.QRCode>[] = this.symbology.parseQrSymbols(fulfillment.qrData);

    const userSymbol: Symbol<SymbolType.User> = qrSymbols.find(s => s.code === 'U');
    if (!!userSymbol) {
      const userCodeStr: string = userSymbol.parts[0].value
      const userCompositeCodes: UserCodeElement[] = this.parseUserCodeElements(userCodeStr);

      //special case, add pref replacement composites:
      fulfillment.ffData
        .filter(d => d.code === '_phone' || d.code === '_email')
        .filter(d => !userCompositeCodes.map(uC => uC.code).some(uCc => d.composites.map(com => com.code).some(com => com === uCc)))
        .forEach(d => d.composites.forEach(c => userCompositeCodes.push({ code: c.code, required: c.required })));

      const ffComposites = [].concat(...fulfillment.ffData
        .filter(d => d.type === SymbolType.User)
        .filter(d => !!d.composites)
        .map(d => d.composites)) //[].concat() flattens

      userCompositeCodes.forEach(uComp => {
        const ffComp = ffComposites.find(c => c.code === uComp.code);
        if (!ffComp) return;
        const uSymbol: Symbol<SymbolType.User> = this.symbology.getSymbolByCompositeCode<SymbolType.User>(SymbolType.User, uComp.code);
        const composite: Composite = uSymbol.composites.find(c => c.code === uComp.code);

        //send skipped keys with "null" value
        const send: boolean = (ffComp.required || !ffComp.skip);

        if (!!ffComp.value) { //composites with values
          payload[composite.jsonKey] = send ? ffComp.value : null;

        } else { //composites mapped to parts
          let ffParts = fulfillment.ffData.find(d => d.type === SymbolType.User && d.code === uSymbol.code).parts;
          composite.partCodes.forEach(partCode => {
            const key: string = uSymbol.parts.find(part => part.code === partCode).jsonKey;
            const value: string = ffParts.find(p => p.code === partCode).value;
            payload[key] = send ? value : null;
          });
        }
      });
    }
  }

  ///
  // Tasks
  ///
  private async taskSendEmail(to: string, subject: string, body: string) {
    console.log('sending email to: ' + to);
    let payload = JSON.stringify({
      to: to,
      subject: subject,
      body: body,
      synchronous: this.model.emailDebug,
    });    
    // return await this.httpRequest('POST', 'https://us-central1-pixelhangersprod.cloudfunctions.net/sendEmail', payload);
    return await this.httpRequest('POST', 'https://us-central1-pixelhangersprod.cloudfunctions.net/sendMail', payload, this.model.emailDebug);
  }

  //task helpers
  private async httpRequest(method: string, url: string, payload: string, debug: boolean) {
    return await new Promise(function (resolve, reject) {
      let xhr = new XMLHttpRequest();
      xhr.open(method, url);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          //if (this.status < 0) {
          resolve(xhr.response);
        } else {          
          reject({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {        
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      
      xhr.onreadystatechange = function() {
        if (debug) {
          if (xhr.readyState)
          alert("State change: " + xhr.responseText);
        }
        console.log("State change: " + xhr.responseText);
      }
      
      xhr.send(payload);
    });


  }

  async displayFailure() {
    let alert = await this.alertController.create({
      header: 'Communications Failure',
      message: 'This mobile device is unable to establish communications to submit the engagement registration request. Request has been saved in Pending.',
      buttons: [
        {
          text: 'OK'
        }
      ]
    });

    await alert.present();
  }

  private async calAPIDocumentation() {
    // prep some variables
    const startDate: Date = new Date(2019, 0, 31, 13, 23); // beware: month 0 = january, 11 = december
    const endDate: Date = new Date(2019, 0, 31, 14, 23); // beware: month 0 = january, 11 = december
    const title: string = "My nice event";
    const eventLocation: string = "Home";
    const notes: string = "Some notes about this event.";
    const calName: string = "Cal Name";
    const success: (message: any) => void = function (message) { alert("Success: " + JSON.stringify(message)); };
    const error: (message: any) => void = function (message) { alert("Error: " + message); };

    // create a calendar (iOS only for now)
    await this.calendar.createCalendar(calName).then(success).catch(error);
    // if you want to create a calendar with a specific color, pass in a JS object like this:
    var createCalOptions = this.calendar.getCreateCalendarOptions();
    createCalOptions.calendarName = calName;
    createCalOptions.calendarColor = "#FF0000"; // an optional hex color (with the # char), default is null, so the OS picks a color
    await this.calendar.createCalendar(createCalOptions).then(success).catch(error);

    // delete a calendar
    await this.calendar.deleteCalendar(calName).then(success).catch(error);

    // create an event silently (on Android < 4 an interactive dialog is shown)
    await this.calendar.createEvent(title, eventLocation, notes, startDate, endDate).then(success).catch(error);

    // create an event silently (on Android < 4 an interactive dialog is shown which doesn't use this options) with options:
    var calOptions = this.calendar.getCalendarOptions(); // grab the defaults
    calOptions.firstReminderMinutes = 120; // default is 60, pass in null for no reminder (alarm)
    calOptions.secondReminderMinutes = 5;

    // Added these options in version 4.2.4:
    // calOptions.recurrence = "monthly"; // supported are: daily, weekly, monthly, yearly
    // calOptions.recurrenceEndDate = new Date(2016, 10, 1, 0, 0, 0, 0, 0); // leave null to add events into infinity and beyond
    // calOptions.calendarName = calName; // iOS only
    // calOptions.calendarId = 1; // Android only, use id obtained from listCalendars() call which is described below. 
    // This will be ignored on iOS in favor of calendarName and vice versa. Default: 1.

    // This is new since 4.2.7:
    calOptions.recurrenceInterval = 2; // once every 2 months in this case, default: 1

    // And the URL can be passed since 4.3.2 (will be appended to the notes on Android as there doesn't seem to be a sep field)
    calOptions.url = "https://www.google.com";

    // on iOS the success handler receives the event ID (since 4.3.6)
    await this.calendar.createEventWithOptions(title, eventLocation, notes, startDate, endDate, calOptions).then(success).catch(error);

    // create an event interactively
    await this.calendar.createEventInteractively(title, eventLocation, notes, startDate, endDate).then(success).catch(error);

    // create an event interactively with the calOptions object as shown above
    await this.calendar.createEventInteractivelyWithOptions(title, eventLocation, notes, startDate, endDate, calOptions).then(success).catch(error);

    // create an event in a named calendar (iOS only, deprecated, use createEventWithOptions instead)
    // await this.calendar.createEventInNamedCalendar(title, eventLocation, notes, startDate, endDate, 'calendarName').then(success).catch(error);

    // find events (on iOS this includes a list of attendees (if any))
    await this.calendar.findEvent(title, eventLocation, notes, startDate, endDate).then(success).catch(error);

    // if you need to find events in a specific calendar, use this one. All options are currently ignored when finding events, except for the calendarName.
    var calOptions = this.calendar.getCalendarOptions();
    calOptions.calendarName = calName; // iOS only
    calOptions.id = "D9B1D85E-1182-458D-B110-4425F17819F1"; // if not found, we try matching against title, etc
    await this.calendar.findEventWithOptions(title, eventLocation, notes, startDate, endDate, calOptions).then(success).catch(error);

    // list all events in a date range (only supported on Android for now)
    await this.calendar.listEventsInRange(startDate, endDate).then(success).catch(error);

    // list all calendar names - returns this JS Object to the success callback: [{"id":"1", "name":"first"}, ..]
    await this.calendar.listCalendars().then(success).catch(error);

    // find all _future_ events in the first calendar with the specified name (iOS only for now, this includes a list of attendees (if any))
    await this.calendar.findAllEventsInNamedCalendar('calendarName').then(success).catch(error);

    // change an event (iOS only for now)
    var newTitle = "New title!";
    await this.calendar.modifyEvent(title, eventLocation, notes, startDate, endDate, newTitle, eventLocation,
      notes, startDate, endDate).then(success).catch(error);

    // or to add a reminder, make it recurring, change the calendar, or the url, use this one:
    var filterOptions = this.calendar.getCalendarOptions(); // or {} or null for the defaults
    filterOptions.calendarName = calName; // iOS only
    filterOptions.id = "D9B1D85E-1182-458D-B110-4425F17819F1"; // iOS only, get it from createEventWithOptions 
    //(if not found, we try matching against title, etc)
    var newOptions = this.calendar.getCalendarOptions();
    newOptions.calendarName = "New Bla"; // make sure this calendar exists before moving the event to it
    // not passing in reminders will wipe them from the event. To wipe the default first reminder (60), set it to null.
    newOptions.firstReminderMinutes = 120;
    await this.calendar.modifyEventWithOptions(title, eventLocation, notes, startDate, endDate, newTitle,
      eventLocation, notes, startDate, endDate, filterOptions, newOptions).then(success).catch(error);

    // delete an event (you can pass nulls for irrelevant parameters). The dates are mandatory and represent a date range to delete events in.
    // note that on iOS there is a bug where the timespan must not be larger than 4 years, see issue 102 for details.. 
    // call this method multiple times if need be
    // since 4.3.0 you can match events starting with a prefix title, so if your event title is 'My app - cool event' then 'My app -' will match.
    await this.calendar.deleteEvent(newTitle, eventLocation, notes, startDate, endDate).then(success).catch(error);

    // delete an event, as above, but for a specific calendar (iOS only)
    await this.calendar.deleteEventFromNamedCalendar(newTitle, eventLocation, notes, startDate, endDate, 'calendarName').then(success).catch(error);

    // delete an event by id. If the event has recurring instances, all will be deleted unless `fromDate` is specified, 
    //which will delete from that date onward. (iOS and android only)
    //await this.calendar.deleteEventById(id, fromDate).then(success).catch(error);

    // open the calendar app (added in 4.2.8):
    // - open it at 'today'
    // await this.calendar.openCalendar();
    // - open at a specific date, here today + 3 days
    // var d = new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000);
    // await this.calendar.openCalendar(d).then(success).catch(error);
  }

}
