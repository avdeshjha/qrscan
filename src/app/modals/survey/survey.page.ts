import { Component, OnInit, ViewChild } from '@angular/core';
import { Platform, NavParams, ModalController, IonContent, IonCheckbox } from '@ionic/angular';
import { ModelService, Fulfillment, SymbolType, FFAction, EmailTask, TaskStatus, UpdateState } from 'src/app/services/model.service';
import { FooterButton } from 'src/app/components/footer/footer.component';
import { FulfillmentService } from 'src/app/services/fulfillment.service';
import { DatabaseService } from 'src/app/services/database.service';

@Component({
    selector: "survey",
    templateUrl: "./survey.page.html",
    styleUrls: ["./survey.page.scss"]
})
export class SurveyPage implements OnInit {
    @ViewChild(IonContent, { static: false }) content: IonContent;

    footerButtons: FooterButton[] = [];
    ff: Fulfillment
    surveyQuestion: string;
    public surveyListOptions: { o: string, selected: boolean }[];
    missingSurveyMode: boolean = false;
    initialSelection: string;
    comments: string;
    writeChoice: string;

    constructor(
        public platform: Platform,
        public model: ModelService,
        private navParams: NavParams,
        private modalCtrl: ModalController,
        private ffService: FulfillmentService,
        private databaseService: DatabaseService
    ) { }

    async ngOnInit() {
        this.ff = this.navParams.get('ff');
        this.surveyQuestion = this.ff.getSurveyQuestion();

        this.footerButtons = [
            {
                text: "Cancel",
                icon: "close",
                callback: (async () => { await this.closeModal() }).bind(this)
            }, {
                text: "Continue",
                icon: "chevron-forward",
                callback: (() => {
                    this.missingSurveyMode = true;
                    this.content.scrollToTop();
                }).bind(this),
            }];

        this.getSurveyOptions(this.ff); // populate survey options
        this.initialSelection = this.ff.getSurveySelection();
        this.surveySelect(this.initialSelection);
        this.comments = this.ff.getComments();

        this.setCheckboxChecked(this.initialSelection);
    }

    async closeModal() {
        this.modalCtrl.dismiss();
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

    async surveySelect(o: string) {
        this.missingSurveyMode = false;

        this.footerButtons = [
            {
                text: "Cancel",
                icon: "close",
                callback: (async () => { await this.closeModal() }).bind(this)
            }, {
                text: "Continue",
                icon: "chevron-forward",
                callback: (() => {
                    this.ff.setUpdateState(UpdateState.SUBMITTED);
                    this.databaseService.saveFF(this.ff);
                    this.ff.ffAction = FFAction.UPDATE;
                    this.ffService.addFulfillment(this.ff);
                    this.modalCtrl.dismiss();
                }),
                highlight: true
            },
        ];

        console.log("0.surveySelect::", o);
        // console.log("1.surveySelect::", this.ff.ffData);
        this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
            .parts[0] = { code: 'O', value: o };

        this.surveyListOptions.forEach(e => e.selected = (e.o === o));
    }

    isChecked: boolean = false;

    setCheckboxChecked(o: string) {
        this.ff.ffData.find(d => d.type === SymbolType.Programmatic && d.code === 'O')
            .parts[0] = { code: 'O', value: o };

        this.surveyListOptions.forEach(e => e.selected = (e.o === o));

        for(let i = 0; i < this.surveyListOptions.length; i++) {
            if(o.indexOf(this.surveyListOptions[i].o) !== -1) {
                this.surveyListOptions[i].selected = true
                this.isChecked = true;
              } else {
                this.isChecked = false;
              }
            
            this.writeChoice = o[o.length - 1];
        }    
    }
}