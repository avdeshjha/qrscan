import { Injectable } from "@angular/core";

import { Domain } from "./database.service";
import { SymbolType, Symbol, Composite, Part } from "./model.service";

//Internal
interface SymbolData {
  code: string;
  impliedPartKey?: string; //jsonKey
  parts?: [string, string][]; //code, jsonKey
  composites?: [string, string, string[]][]; //code, jsonKey, partCodes[]
}

@Injectable({
  providedIn: "root",
})
export class SymbologyService {
  private userSymbolRepo: Map<string, Symbol<SymbolType.User>> = new Map<
    string,
    Symbol<SymbolType.User>
  >();
  private qrSymbolRepo: Map<string, Symbol<SymbolType.QRCode>> = new Map<
    string,
    Symbol<SymbolType.QRCode>
  >();
  private actionSymbolRepo: Map<string, Symbol<SymbolType.Action>> = new Map<
    string,
    Symbol<SymbolType.Action>
  >();
  private actionOptionSymbolRepo: Map<string, Symbol<SymbolType.ActionOption>> =
    new Map<string, Symbol<SymbolType.ActionOption>>();
  private programmaticSymbolRepo: Map<string, Symbol<SymbolType.Programmatic>> =
    new Map<string, Symbol<SymbolType.Programmatic>>();

  constructor() {
    //build user symbols from user symbol data
    for (let i = 0; i < this.userSymbolData.length; i++) {
      let d: SymbolData = this.userSymbolData[i];
      //symbol
      let s: Symbol<SymbolType.User> = {
        databaseID: Domain.SYMBOL + "." + SymbolType.User + "." + d.code,
        type: SymbolType.User,
        code: d.code,
        text: this.localization.user.symbol[d.code].en, //todo select locale
      };

      //parts
      if (d.parts) {
        let parts: Part[] = [];
        for (let j = 0; j < d.parts.length; j++) {
          let partData = d.parts[j];
          parts.push({
            code: partData[0],
            jsonKey: partData[1],
            text: this.localization.user.part[partData[0]].en, //todo select locale
          });
        }
        s.parts = parts;
      } else {
        //implied part
        s.parts = [
          {
            code: d.code,
            jsonKey: d.impliedPartKey,
            text: this.localization.user.symbol[d.code].en, //todo select locale
          },
        ];
      }

      //composites
      let composites: Composite[] = [];
      if (d.composites) {
        for (let j = 0; j < d.composites.length; j++) {
          let compositeData = d.composites[j];
          let composite: Composite = {
            code: compositeData[0],
            jsonKey: compositeData[1],
            text: this.localization.user.composite[compositeData[0]].en, //todo select locale
          };
          if (!!compositeData[2]) {
            composite.partCodes = compositeData[2];
          }
          composites.push(composite);
        }
      }
      //implied composite
      composites.push({
        code: d.code,
        partCodes: s.parts.map((p) => p.code),
      });

      s.composites = composites;

      this.userSymbolRepo.set(d.code, s);
    }
    // console.log('User Symbol Model Constructed');
    // console.table(this.userSymbolRepo);

    //build qr symbols from qr symbol data
    for (let i = 0; i < this.qrSymbolData.length; i++) {
      let d: SymbolData = this.qrSymbolData[i];
      this.qrSymbolRepo.set(d.code, {
        databaseID: Domain.SYMBOL + "." + SymbolType.QRCode + "." + d.code,
        type: SymbolType.QRCode,
        code: d.code,
        text: this.localization.qr.symbol[d.code].en, //todo select locale
        //implied part
        parts: [{ code: d.code, jsonKey: d.impliedPartKey }],
        //implied composite
        composites: [{ code: d.code, partCodes: [d.code] }],
      });
    }
    // console.log('QR Symbol Model Constructed');
    // console.table(this.qrSymbolRepo);

    //build action symbols from action symbol data
    for (let i = 0; i < this.actionSymbolData.length; i++) {
      let d: SymbolData = this.actionSymbolData[i];
      this.actionSymbolRepo.set(d.code, {
        databaseID: Domain.SYMBOL + "." + SymbolType.Action + "." + d.code,
        type: SymbolType.Action,
        code: d.code,
        //implied composite
        composites: [{ code: d.code }],
        text: this.localization.action.symbol[d.code].en, //todo select locale
      });
    }
    // console.log('Action Symbol Model Constructed');
    // console.table(this.actionSymbolRepo);

    //build action option symbols from symbol data
    for (let i = 0; i < this.actionOptionSymbolData.length; i++) {
      let d: SymbolData = this.actionOptionSymbolData[i];

      this.actionOptionSymbolRepo.set(d.code, {
        databaseID:
          Domain.SYMBOL + "." + SymbolType.ActionOption + "." + d.code,
        type: SymbolType.ActionOption,
        code: d.code,
        //implied part
        parts: [
          !!d.impliedPartKey
            ? { code: d.code, jsonKey: d.impliedPartKey }
            : null,
        ],
        //implied composite
        composites: [{ code: d.code }],
        text: this.localization.actionOption.symbol[d.code].en, //todo select locale
      });
    }

    //build programmatic symbols from programmatic symbol data
    for (let i = 0; i < this.programmaticSymbolData.length; i++) {
      let d: SymbolData = this.programmaticSymbolData[i];
      this.programmaticSymbolRepo.set(d.code, {
        databaseID:
          Domain.SYMBOL + "." + SymbolType.Programmatic + "." + d.code,
        type: SymbolType.Programmatic,
        code: d.code,
        //implied part
        parts: [{ code: d.code, jsonKey: d.impliedPartKey }],
        //implied composite or defined composite
        composites: [{ code: d.code, partCodes: [d.code] }],
        text: this.localization.programmatic.symbol[d.code].en, //todo detect locale
      });
    }

    // console.log('Programmatic Symbol Model Constructed');
    // console.table(this.programmaticSymbolRepo);
  }

  public getSymbol<T>(type: SymbolType, code: string): Symbol<T> {
    return this.getRepo<T>(type).get(code);
  }

  public getSymbols<T>(type: SymbolType): Symbol<T>[] {
    return Array.from(this.getRepo(type).values());
  }

  public getSymbolByCompositeCode<T>(
    type: SymbolType,
    cCode: string
  ): Symbol<T> {
    return Array.from(this.getRepo<T>(type).values()).find(
      (s) => !!s.composites && s.composites.some((c) => c.code === cCode)
    );
  }

  public getPartsForComposite(
    symbol: Symbol<any>,
    compositeCode: string
  ): Part[] {
    const partCodes: string[] = symbol.composites.find(
      (c) => c.code === compositeCode
    ).partCodes;
    return symbol.parts.filter((part) =>
      partCodes.some((c) => c === part.code)
    );
  }

  public parseQrSymbols(qrData: string): Symbol<SymbolType.QRCode>[] {
    if (qrData.indexOf("♥") <= 0) return null;
    return qrData
      .replace(/(\r\n\t|\n|\r\t)/gm, "")
      .split("♥") // <- QR DELIMITER
      .filter((element) => element.length > 0)
      .map((element) => {
        let symbol: Symbol<SymbolType.QRCode>;
        for (let i = 1; i < 3; i++) {
          const code: string = element.substring(0, i);
          const value: string = element.substring(i);

          console.log('0.getSymbol:' + code);
          console.log('1.getValue:' + value);
          let symbol: Symbol<SymbolType.QRCode> =
            this.getSymbol<SymbolType.QRCode>(SymbolType.QRCode, code);
          if (!!symbol) {
            symbol.parts[0].value = value;
            return symbol;
          }
        }
        if (!symbol) {
          console.error("Unable to find symbol in  " + element);
          return null;
        }
      })
      .filter((e) => !!e);
  }

  public parseScanLocation(scanLocString: String) {
    let firstIndex = scanLocString.slice().search(/[a-zA-Z]/);
    let lastIndex = scanLocString
      .slice()
      .split("")
      .reverse()
      .join("")
      .search(/[a-zA-Z]/);
    lastIndex = scanLocString.length - lastIndex;

    let siteId: String = scanLocString.substring(0, firstIndex);
    let mediaType: String = scanLocString.substring(firstIndex, lastIndex);
    let locationId: String = scanLocString.substring(lastIndex);

    return { siteId, mediaType, locationId };
  }

  private getRepo<T>(type: SymbolType): Map<string, Symbol<T>> {
    let repo: Map<string, Symbol<T>>;
    switch (type) {
      case SymbolType.User:
        repo = this.userSymbolRepo;
        break;
      case SymbolType.QRCode:
        repo = this.qrSymbolRepo;
        break;
      case SymbolType.Action:
        repo = this.actionSymbolRepo;
        break;
      case SymbolType.ActionOption:
        repo = this.actionOptionSymbolRepo;
        break;
      case SymbolType.Programmatic:
        repo = this.programmaticSymbolRepo;
        break;
    }
    return repo;
  }

  //User Symbols Data
  private userSymbolData: SymbolData[] = [
    {
      code: "1",
      parts: [
        ["P", "Prefix"],
        ["F", "First_Name"],
        ["L", "Last_Name"],
      ],
    },
    {
      code: "2",
      parts: [
        ["M", "DOB_M"],
        ["D", "DOB_D"],
        ["Y", "DOB_Y"],
      ],
      composites: [
        ["4", "Age", ["D", "M", "Y"]],
        ["5", "bday", ["D", "M"]],
      ],
    },
    {
      code: "3",
      parts: [
        ["A", "Adrs1"],
        ["B", "Adrs2"],
        ["C", "City"],
        ["S", "State"],
        ["O", "Country"],
        ["Z", "Zip"],
      ],
      composites: [["C", "region", ["O", "S", "Z"]]],
    },
    {
      code: "G",
      impliedPartKey: "Gender",
    },
    {
      code: "_phone",
      parts: [
        ["V", "Cell_phone"],
        ["W", "Work_phone"],
        ["X", "Home_phone"],
        ["8", "Pref_phone"],
      ],
      composites: [
        ["V", "Cell_phone", ["V"]],
        ["W", "Work_phone", ["W"]],
        ["X", "Home_phone", ["X"]],
        ["8", "Pref_phone", null],
      ],
    },
    {
      code: "_email",
      parts: [
        ["H", "Home_email"],
        ["I", "Work_email"],
        ["J", "Alt_email"],
        ["9", "Pref_email"],
      ],
      composites: [
        ["H", "Home_email", ["H"]],
        ["I", "Work_email", ["I"]],
        ["J", "Alt_email", ["J"]],
        ["9", "Pref_email", null],
      ],
    },
  ];

  //QR Symbols Data
  private qrSymbolData: SymbolData[] = [
    {
      code: "A",
      impliedPartKey: "action",
    },
    {
      code: "S",
      impliedPartKey: "sponsor",
    },
    {
      code: "P",
      impliedPartKey: "provider",
    },
    {
      code: "D",
      impliedPartKey: "description",
    },
    {
      code: "Y",
      impliedPartKey: "confirmation",
    },
    {
      code: "C",
      impliedPartKey: "campaign_id",
    },
    {
      code: "F",
      impliedPartKey: "promo_id",
    },
    {
      code: "X",
      impliedPartKey: "promo_code",
    },
    {
      code: "U",
      impliedPartKey: "user_data",
    },
    {
      code: "T",
      impliedPartKey: "lag_time",
    },
    {
      code: "K",
      impliedPartKey: "remoteClock",
    },
    {
      code: "R",
      impliedPartKey: "url",
    },
    {
      code: "G",
      impliedPartKey: "email_body",
    },
    {
      code: "H",
      impliedPartKey: "scan_location",
    },
    {
      code: "I",
      impliedPartKey: "item_description",
    },
    {
      code: "J",
      impliedPartKey: "item_id",
    },
    {
      code: "p",
      impliedPartKey: "price",
    },
    {
      code: "m",
      impliedPartKey: "max_quantity",
    },
    {
      code: "O",
      impliedPartKey: "survey_options",
    },
    {
      code: "3",
      impliedPartKey: "summary",
    },
    {
      code: "4",
      impliedPartKey: "geo_location",
    },
    {
      code: "e",
      impliedPartKey: "event_site",
    },
    {
      code: "l",
      impliedPartKey: "event_location",
    },
    {
      code: "L",
      impliedPartKey: "scan_location_id",
    },
    {
      code: "Z",
      impliedPartKey: "content_item_id",
    },
    {
      code: "1S",
      impliedPartKey: "camp_start",
    },
    {
      code: "1E",
      impliedPartKey: "camp_end",
    },
    {
      code: "9C",
      impliedPartKey: "Camp_Window",
    },
    // {
    //   code: '0S',
    //   impliedPartKey: 'eRedeem_Start'
    // }, {
    //   code: '0E',
    //   impliedPartKey: 'eRedeem_End'
    // },
    {
      code: "9F",
      impliedPartKey: "Redeem_Fixed_Window",
    },
    {
      code: "9r",
      impliedPartKey: "Redeem_Fixed_Window",
    },
    // {
    //   code: '0T',
    //   impliedPartKey: 'eRedeem_Rel_Start'
    // }, {
    //   code: '0F',
    //   impliedPartKey: 'eRedeem_Rel_End'
    // },
    {
      code: "0E",
      impliedPartKey: "Redeem_Rel_Window",
    },
    {
      code: "0r",
      impliedPartKey: "Redeem_Rel_Window",
    },
    {
      code: "d",
      impliedPartKey: "incentive_description",
    },
    {
      code: "7",
      impliedPartKey: "Incentive_Redeem_Type",
    },
    {
      code: "t",
      impliedPartKey: "Reward_Redeem_Type",
    },
    // {
    //   code: '2S',
    //   impliedPartKey: 'sfa_start'
    // }, {
    //   code: '2E',
    //   impliedPartKey: 'sfa_end'
    // },
    {
      code: "9E",
      impliedPartKey: "sfa_end",
    },
    {
      code: "N",
      impliedPartKey: "Max_Guests",
    },
    {
      code: "c",
      impliedPartKey: "Punches_Needed",
    },
    {
      code: "W",
      impliedPartKey: "Max_Punches",
    },
    {
      code: "V",
      impliedPartKey: "Punches_Starter",
    },
    {
      code: "d",
      impliedPartKey: "Punch_Incentive_Description",
    },
    {
      code: "s",
      impliedPartKey: "Punch_Incentive_Sponsor",
    },
    // {
    //   code: '0s',
    //   impliedPartKey: 'Punch_eRedeem_Start'
    // }, {
    //   code: '0e',
    //   impliedPartKey: 'Punch_eRedeem_End'
    // },
    {
      code: "9R",
      impliedPartKey: "Reward_Fixed_Window", // for punch
    },
    {
      code: "0R",
      impliedPartKey: "Reward_Rel_Window", // for punch
    },
    {
      code: "9d",
      impliedPartKey: "Incent_Draw_Date", // for punch
    },
    {
      code: "9i",
      impliedPartKey: "Incent_Punch_Window", // for punch
    },
    {
      code: "9r",
      impliedPartKey: "Incent_Redeem_Window",
    },
    {
      code: "e",
      impliedPartKey: "Incent_Site",
    },
    {
      code: "l",
      impliedPartKey: "Incent_Location",
    },
    {
      code: "p",
      impliedPartKey: "Incent_Price",
    },
    {
      code: "m",
      impliedPartKey: "Incent_Limit",
    },
    {
      code: "i",
      impliedPartKey: "Incent_Desc",
    },
    {
      code: "a",
      impliedPartKey: "Action_for_ePunch",
    },
    {
      code: "j",
      impliedPartKey: "Reward_Redeem_Site",
    },
    {
      code: "k",
      impliedPartKey: "Reward_Redeem_Location",
    },
  ];

  //Action Symbols Data
  private actionSymbolData: SymbolData[] = [
    {
      code: "A",
    },
    {
      code: "B",
    },
    {
      code: "C",
    },
    {
      code: "D",
    },
    {
      code: "E",
    },
    {
      code: "F",
    },
    {
      code: "G",
    },
    {
      code: "H",
    },
    {
      code: "I",
    },
    {
      code: "J",
    },
    {
      code: "L",
    },
    {
      code: "P",
    },
    {
      code: "Q",
    },
    {
      code: "R",
    },
    {
      code: "S",
    },
    {
      code: "U",
    },
  ];

  //Action symbols options and variations
  private actionOptionSymbolData: SymbolData[] = [
    {
      code: "b", // media type - web
    },
    {
      code: "c", // [promo] - eCoupon
    },
    {
      code: "d", // [any] - drawing
    },
    {
      code: "e", // (eRedeemQRData) eReader wait<seconds>
    },
    {
      code: "i", // [survey] - write in
    },
    {
      code: "k", // [survey] - comments
    },
    {
      code: "m", // [survey] - multiple select
    },
    {
      code: "o", // [any] - allow calendar after cancel
    },
    {
      code: "r", // media type - print
    },
    {
      code: "s", // media type - digital signage
    },
    // }, {
    //   code: 't', // [event] - eticket
    // }, {
    {
      code: "w", // [any] - wait<seconds>
    },
    {
      code: "A", // [punch] - count
    },
    {
      code: "P", // [punch] - purchases
    },
    {
      code: "K", // [punch] - check-in
    },
    {
      code: "2", // [punch] - only in pCode for identify it's pCode.
    },
  ];

  //Programmic Symbols Data
  private programmaticSymbolData: SymbolData[] = [
    {
      code: "T",
      impliedPartKey: "Reg_Time",
    },
    {
      code: "I",
      impliedPartKey: "Rdr_ID",
    },
    {
      code: "O",
      impliedPartKey: "Survey_Sel",
    },
    {
      code: "C",
      impliedPartKey: "comment",
    },
  ];

  //https://beta.ionicframework.com/docs/native/globalization/
  //BCP 47 compliant locale identifier string
  //type.(symbol|part|composite).code.locale
  private localization = {
    user: {
      symbol: {
        "1": { en: "Name" },
        "2": { en: "D.O.B." },
        "3": { en: "Address" },
        G: { en: "Gender" },
        _phone: { en: "Phone Number" },
        _email: { en: "Email Address" },
      },
      part: {
        P: { en: "Prefix" },
        F: { en: "First" },
        L: { en: "Last" },
        D: { en: "Day" },
        M: { en: "Month" },
        Y: { en: "Year" },
        A: { en: "Line 1" },
        B: { en: "Line 2" },
        C: { en: "City" },
        S: { en: "State" },
        O: { en: "Country" },
        Z: { en: "Zip" },
        V: { en: "Cellphone" },
        W: { en: "Work Phone" },
        X: { en: "Home Phone" },
        "8": { en: "Preferred Phone" },
        H: { en: "Home Email" },
        I: { en: "Work Email" },
        J: { en: "Alternate Email" },
        "9": { en: "Preferred Email" },
      },
      composite: {
        "4": { en: "Age" },
        "5": { en: "Birthday" },
        C: { en: "Region" },
        V: { en: "Cellphone" },
        W: { en: "Work Phone" },
        X: { en: "Home Phone" },
        H: { en: "Home Email" },
        I: { en: "Work Email" },
        J: { en: "Alternate Email" },
        "8": { en: "Preferred Phone" },
        "9": { en: "Preferred Email" },
      },
    },
    qr: {
      symbol: {
        A: { en: "Action" },
        S: { en: "Sponsor" },
        P: { en: "Provider" },
        D: { en: "Description" },
        Y: { en: "Confirmation" },
        C: { en: "Campaign ID" },
        F: { en: "Promo ID" },
        K: { en: "Remote Clock" },
        X: { en: "Promo Code" },
        U: { en: "User Data" },
        T: { en: "Lag Time" },
        R: { en: "URL" },
        G: { en: "Email (body)" },
        H: { en: "Scan Location" },
        d: { en: "Reward Description" },
        I: { en: "Item Description" },
        J: { en: "Item ID" },
        $: { en: "Price" },
        M: { en: "Max Quantity" },
        O: { en: "Survey Option" },
        "3": { en: "Summary" },
        "4": { en: "Geo Location" },
        "5": { en: "Event Site" },
        "6": { en: "Event Location" },
        L: { en: "Scan Location ID" },
        Z: { en: "Content Item ID" },
        // '0S': { en: 'eRedeem Start' },
        // '0E': { en: 'eRedeem End' },
        "9F": { en: "eRedeem Window" },
        // "9r": { en: "eRedeem Window" },
        // '0T': { en: 'eRedeem Relative Start' },
        // '0F': { en: 'eRedeem Relatuve End' },
        "0E": { en: "eRedeem Relative Window" },
        "0r": { en: "eRedeem Relative Window" },
        "1S": { en: "Campaign Start" },
        "1E": { en: "Campaign End" },
        "9C": { en: "Campaign Window" },
        // '2S': { en: 'QRA Start' },
        // '2E': { en: 'QRA End' },
        "9E": { en: "QRA End" },
        "7": { en: "Incentive Redeem Type" },
        t: { en: "Reward Redeem Type" },
        N: { en: "Max Guests" },
        c: { en: "Punches Needed" },
        W: { en: "Max Punches" },
        V: { en: "Punches Starter" },
        s: { en: "Punch Incentive Sponsor" },
        // '0s': { en: 'Punch eRedeem Start' },
        // '0e': { en: 'Punch eRedeem End' }
        "9R": { en: "Punch Reward Redeem Window" },
        "0R": { en: "Punch Reward Relative Redeem Window" },
        "9d": { en: "Incent Draw Date" },
        "9i": { en: "Incent Punch Window" },
        "9r": { en: "Incent Redeem Window" },
        e: { en: "Incent site" },
        l: { en: "Incent Location" },
        p: { en: "Incent Price" },
        m: { en: "Incent Item Limit" },
        i: { en: "Incentive Item Description" },
        a: { en: "Call to Action Text" },
        j: { en: "Reward Redeem Site" },
        k: { en: "Reward Redeem Location" },
      },
    },
    action: {
      symbol: {
        A: { en: "EPub Registration" },
        B: { en: "Postal Pub Registration" },
        C: { en: "Community Opt-in" },
        D: { en: "Event" },
        E: { en: "Event w/ Guests" },
        F: { en: "Event Reminder" },
        G: { en: "Enter Drawing" },
        H: { en: "Reserve Item" },
        I: { en: "Purchase Item" },
        J: { en: "Survey" },
        S: { en: "Five Star Survey" },
        L: { en: "Comment" },
        P: { en: "eCoupon to Card" },
        Q: { en: "Promo to Mobile" },
        R: { en: "Redeem Mobile Promo" },
        U: { en: "Loyalty ePunch Card" },
      },
    },
    actionOption: {
      symbol: {
        b: { en: "Media Type: Web" },
        c: { en: "eCoupon" },
        d: { en: "Drawing" },
        e: { en: "eReader Wait" },
        i: { en: "Survey: Write in" },
        k: { en: "Survey: Comments" },
        m: { en: "Survey: Multiple Selections" },
        o: { en: "Add to Calendar on Cancel" },
        r: { en: "Media Type: Print" },
        s: { en: "Media Type: Digital Signage" },
        // 't': { en: 'Event: eTicket' },
        w: { en: "Wait" },
        A: { en: "Punch Count" },
        P: { en: "Punch Purchases" },
        K: { en: "Punch Check-in" },
        "2": { en: "Specific for pCode" },
      },
    },
    programmatic: {
      symbol: {
        T: { en: "Scan Time" },
        I: { en: "Device ID" },
        O: { en: "Survey Option" },
        C: { en: "Comment" },
      },
    },
  };
}
