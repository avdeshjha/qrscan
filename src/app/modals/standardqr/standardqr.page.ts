import { Component, OnInit } from '@angular/core';
import { Platform, NavParams, ToastController, ModalController } from '@ionic/angular';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { Contacts, Contact, ContactField, ContactName, ContactOrganization, ContactAddress } from '@ionic-native/contacts/ngx';
import { ModelService } from 'src/app/services/model.service';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { QrCodeTags } from 'src/app/shared/enums/qrcode-tags.enum';
import { QrCodeType } from 'src/app/shared/enums/qrcode-type.enum';
import { Calendar } from '@ionic-native/calendar/ngx';
import * as moment from 'moment';
// import { WifiWizard2 } from '@ionic-native/wifi-wizard-2/ngx';
@Component({
    selector: 'qr-scan',
    templateUrl: './standardqr.page.html',
    styleUrls: ['./standardqr.page.scss']
})
export class StandardQRPage implements OnInit {
    buttons: FooterButton[] = [];
    qrData = '';
    cancelButton: FooterButton = {
        text: 'Cancel',
        icon: 'close',
        callback: (async () => this.closeModal()).bind(this)
    };
    openBrowserButton: FooterButton = {
        text: 'Open Link',
        icon: 'browsers',
        callback: (async () => {
            this.buttonAction(this.qrData);
        }).bind(this)
    };
    copyTextButton: FooterButton = {
        text: 'Copy text',
        icon: 'copy',
        callback: (async () => {
            this.copyText(this.qrData);
        }).bind(this)
    };
    constructor(
        public platform: Platform,
        public model: ModelService,
        private navParams: NavParams,
        private clipboard: Clipboard,
        private toast: ToastController,
        private modalCtrl: ModalController,
        private contacts: Contacts,
        private calendar: Calendar,
        // private wifiWizard: WifiWizard2
    ) { }

    async ngOnInit() {
        this.qrData = this.navParams.get('qrData');
        const currentCodeType = this.getCodeType();
        
        if (currentCodeType === QrCodeType.MAILTO) {
            this.openBrowserButton.text = 'Open Email';
            this.openBrowserButton.icon = 'mail';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.URL) {
            this.openBrowserButton.text = 'Open URL';
            this.openBrowserButton.icon = 'browsers';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.TEL) {
            this.openBrowserButton.text = 'Call';
            this.openBrowserButton.icon = 'call';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.SMS) {
            this.openBrowserButton.text = 'SMS';
            this.openBrowserButton.icon = 'text';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.GEO) {
            this.openBrowserButton.text = 'Geo';
            this.openBrowserButton.icon = 'navigate';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.BIZCARD) {
            this.openBrowserButton.text = 'Create contact';
            this.openBrowserButton.icon = 'person-add';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.HTTP) {
            this.openBrowserButton.text = 'Open URL';
            this.openBrowserButton.icon = 'browsers';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.VEVENT) {
            this.openBrowserButton.text = 'Create Event';
            this.openBrowserButton.icon = 'browsers';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.MECARD) {
            this.openBrowserButton.text = 'Create contact';
            this.openBrowserButton.icon = 'person-add';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else if (currentCodeType === QrCodeType.WIFI) {
            this.openBrowserButton.text = 'Connect WIFI';
            this.openBrowserButton.icon = 'wifi';
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        } else {
            this.buttons = [this.cancelButton, this.openBrowserButton, this.copyTextButton];
        }
    }

    async closeModal() {
        this.modalCtrl.dismiss();
    }

    getCodeType(): QrCodeType {
        if (this.qrData.toUpperCase().startsWith(QrCodeType.URL)) {
            return QrCodeType.URL;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.BIZCARD)) {
            return QrCodeType.BIZCARD;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.GEO)) {
            return QrCodeType.GEO;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.MAILTO)) {
            return QrCodeType.MAILTO;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.SMS) || this.qrData.toUpperCase().startsWith(QrCodeType.SMSTO)) {
            return QrCodeType.SMS;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.TEL)) {
            return QrCodeType.TEL;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.VEVENT)) {
            return QrCodeType.VEVENT;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.HTTP)) {
            return QrCodeType.HTTP;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.MECARD)) {
            return QrCodeType.MECARD;
        } else if (this.qrData.toUpperCase().startsWith(QrCodeType.WIFI)) {
            return QrCodeType.WIFI;
        }
    }

    validURL(str): boolean {
        const pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
            '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
        return !!pattern.test(str);
    }

    async copyText(qrData: string) {
        await this.clipboard.copy(qrData);
        await this.showToast('Text Copied');
    }

    async buttonAction(qrData: string) {
        
        const qSplitData = qrData.split(':');
        if (this.getCodeType() === QrCodeType.MAILTO) {
            window.open(QrCodeTags.MAILTO + qSplitData[1], '_system');
        } else if (this.getCodeType() === QrCodeType.URL || this.getCodeType() == QrCodeType.HTTP) {
            // if (!qSplitData[1].startsWith.tol(QrCodeTags.HTTP) && !qSplitData[1].startsWith(QrCodeTags.HTTPS)) {
            //     qrData = QrCodeTags.HTTPS + qrData;
            // }
            window.open(qrData, '_system', 'location=yes');
        } else if (this.getCodeType() === QrCodeType.TEL) {
            window.open(QrCodeTags.TEL + qSplitData[1], '_system');
        } else if (this.getCodeType() === QrCodeType.SMS) {
            let url = '';
            if (this.platform.is('ios')) {
                url = QrCodeTags.SMS + qSplitData[1] + '&body=' + encodeURIComponent( qSplitData[2]) + '';
            } else if (this.platform.is('android')) {
                url = QrCodeTags.SMS + qSplitData[1] + '?body=' + qSplitData[2] + '';
            }
            window.open(url, '_system');
        } else if (this.getCodeType() === QrCodeType.GEO) {
            if (this.platform.is('ios')) {
                window.open(QrCodeTags.GEOIOS + qSplitData[1], '_system');
            } else {
                window.open(QrCodeTags.GEO + qSplitData[1], '_system');

            }
        } else if (this.getCodeType() === QrCodeType.BIZCARD) {
            

            const bizCardDetail = qrData.substring(qrData.indexOf(':') + 1).split('\n').map(this.splitStr);
            const contactObject = Object.assign({}, ...bizCardDetail);
            const contact: Contact = this.contacts.create();
            if (contactObject.N) {


                if (contactObject.N.includes(';')) {
                    var nameSplit = contactObject.N.split(';');
                    contact.name = new ContactName(null, nameSplit[0], nameSplit[1]);
                } else {
                    contact.name = new ContactName(null, contactObject.N);
                }
            }
            if (contactObject.ORG) {
                contact.organizations = [new ContactOrganization(null, 'Company', contactObject.ORG)];
            }
            if (contactObject.ADR) {
                if (contactObject.ADR.includes(';')) {
                    var contactSplit = contactObject.ADR.split(';');
                    contact.addresses = [new ContactAddress(false, contactSplit[0], contactSplit[1],
                        contactSplit[2], contactSplit[3], contactSplit[4], contactSplit[5], contactSplit[6])];

                } else {
                    contact.addresses = [new ContactAddress(false, '', '', contactObject.ADR)];

                }
            }
            if (contactObject['TEL;CELL']) {
                contact.phoneNumbers = [new ContactField('mobile', contactObject['TEL;CELL'])];
            }
            if (contactObject['TEL']) {
                contact.phoneNumbers = [new ContactField('mobile', contactObject['TEL'])];
            }
            if (contactObject['TEL;TYPE=voice,cell,pref']) {
                contact.phoneNumbers = [new ContactField('mobile', contactObject['TEL;TYPE=voice,cell,pref'])];
            }

            if (contactObject['EMAIL;WORK;INTERNET']) {
                contact.emails = [new ContactField('email', contactObject['EMAIL;WORK;INTERNET'])];

            }
            if (contactObject['EMAIL;TYPE=INTERNET']) {
                contact.emails = [new ContactField('email', contactObject['EMAIL;TYPE=INTERNET'])];

            }
            contact.save().then(
                async (res) => {
                    await this.showToast('Contact Saved!!');
                },
                (error: any) => console.error('Error saving contact.', error)
            );
        } else if (this.getCodeType() === QrCodeType.VEVENT) {

            const eventQrDetails = this.qrData.split('\n').map(this.splitStr);
            const eventQrObject = Object.assign({}, ...eventQrDetails);
            const calenderList = await this.calendar.listCalendars();
            const defaultCalender = calenderList.find(c => c.isPrimary === true);
            const startDate = moment(eventQrObject.DTSTART, 'YYYYMMDDTHHmmss').toDate();
            const endDate = moment(eventQrObject.DTEND, 'YYYYMMDDTHHmmss').toDate();
            const title = eventQrObject.SUMMARY;
            const notes = eventQrObject.SUMMARY;
            const eventLocation = eventQrObject.LOCATION;
            const calOptions = this.calendar.getCalendarOptions();
            calOptions.calendarName = 'Home'; // iOS only
            calOptions.calendarId = defaultCalender ? defaultCalender.id : 1;
            this.calendar.createEventWithOptions(title, eventLocation, notes, startDate, endDate, calOptions).then(async res => {
                await this.showToast('Event added!!');

            });

        } else if (this.getCodeType() === QrCodeType.MECARD) {
            
            const bizCardDetail = qrData.substring(qrData.indexOf(':') + 1).split(';').map(this.splitStr);
            const contactObject = Object.assign({}, ...bizCardDetail);
            const contact: Contact = this.contacts.create();
            if (contactObject.N) {
                if (contactObject.N.includes(',')) {
                    var nameSplit = contactObject.N.split(',');
                    contact.name = new ContactName(null, nameSplit[0], nameSplit[1]);
                } else {
                    contact.name = new ContactName(null, contactObject.N);
                }
            }
            if (contactObject.NICKNAME) {
                contact.nickname = contactObject.NICKNAME;
            }
            if (contactObject.ADR) {
                if (contactObject.ADR.includes(';')) {
                    var contactSplit = contactObject.ADR.split(';');
                    contact.addresses = [new ContactAddress(false, contactSplit[0], contactSplit[1],
                        contactSplit[2], contactSplit[3], contactSplit[4], contactSplit[5], contactSplit[6])];

                } else {
                    contact.addresses = [new ContactAddress(false, '', '', contactObject.ADR)];

                }
            }
            if (contactObject.TEL) {
                contact.phoneNumbers = [new ContactField('mobile', contactObject.TEL)];

            }
            if (contactObject.EMAIL) {
                contact.emails = [new ContactField('email', contactObject.EMAIL)];

            }


            contact.save().then(
                async (res) => {
                    await this.showToast('Contact Saved!!');
                },
                (error: any) => console.error('Error saving contact.', error)
            );


        } else if (this.getCodeType() === QrCodeType.WIFI) {
            
            const bizCardDetail = qrData.substring(qrData.indexOf(':') + 1).split(';').map(this.splitStr);
            const contactObject = Object.assign({}, ...bizCardDetail);
            if (this.platform.is('ios')) {
                // this.wifiWizard.iOSConnectNetwork(contactObject.S,contactObject.P).then(res => {
                //     this.showToast('Connection successful');
                // }, err => {
                //     this.showToast('Something went wrong');
                // })
            } else {
                // this.wifiWizard.connect(contactObject.S, true, contactObject.P, 'WPA').then(res => {
                //     this.showToast('Connection successful');
                // }, err => {
                //     this.showToast('Something went wrong');
                // })

            }
            
        }
    }

    async showToast(toastMessage) {
        const toast = await this.toast.create({
            message: toastMessage,
            duration: 7000
        });
        toast.present();
    }

    splitStr = (key) => {
        if (key !== '' && key.includes(':')) {
            const keyArray = key.split(':');
            return { [keyArray[0].trim()]: keyArray[1].trim() };
        } else {
            return '';
        }
    }
}
