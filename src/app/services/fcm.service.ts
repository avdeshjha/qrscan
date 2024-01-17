import { Injectable } from "@angular/core";
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from "@capacitor/push-notifications";
import { LocalNotifications, ActionPerformed as LocalActionPerformed, LocalNotificationSchema } from "@capacitor/local-notifications";
import { RemotePush } from "../custom_plugins/RemotePush";
import { CancelState, FFAction, FFState, Fulfillment, ModelService, RedeemMethod, RedeemStatus, UpdateState } from "./model.service";
import { DatabaseService } from "./database.service";
import { FulfillmentService } from "./fulfillment.service";
@Injectable({
    providedIn: 'root'
})
export class FcmService {

    constructor(
        private model: ModelService,
        public database: DatabaseService,
        private ffService: FulfillmentService,
    ) { }

    public initPush() {
        console.log("Init push started");

        PushNotifications.requestPermissions().then(result => {
            if (result.receive === 'granted') {
                console.log("Permission granted");
                PushNotifications.register();
            } else {
                // TODO handle permission denied
                console.log("Permission denied");
            }
        });

        PushNotifications.addListener('registration', (token: Token) => {
            console.log("Push registered. Token is: " + token.value);
            // deviceToken = token;
            this.model.fcmToken = token.value;
        });

        PushNotifications.addListener('registrationError', (error: any) => {
            console.log("Registration failed: " + JSON.stringify(error));
        });

        PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
            console.log(`FCM message:` + JSON.stringify(notification, null, 2));

            let processedData = this.preparePushJSON(notification.data);
            console.log("Processing push:" + JSON.stringify(processedData, null, 2));
            if (this.model.showPush) {
                alert(JSON.stringify(processedData, null, 2));
            }
            this.processPush(processedData);
            this.buildNotification(processedData);
        });

        // notification listener for iOS
        RemotePush.addListener('OnRemoteNotification', (notification: any) => {
            console.log(`iOS FCM message:` + JSON.stringify(notification, null, 2));

            let processedData = this.preparePushJSON(notification.data);
            console.log("Processing push:" + JSON.stringify(processedData, null, 2));
            if (this.model.showPush) {
                alert(JSON.stringify(processedData, null, 2));
            }
            this.processPush(processedData);
            this.buildNotification(processedData);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            // this shouldn't be triggered since we are using local notifications
            console.log("Push action performed: " + JSON.stringify(action));
        });

        LocalNotifications.addListener("localNotificationActionPerformed", (action: LocalActionPerformed) => {
            console.log("Action received: " + JSON.stringify(action));
            if (action.actionId === "tap") {
                this.displayPushAsAlert(action.notification.extra.data);
            } else if (action.actionId === "button1") {
                console.log("button1 pressed");
                let engageID = action.notification.extra.data.Context.Engage_ID;
                let response = action.notification.extra.data.Push.Response.Button_Lf;                
                this.responseFulfillment(engageID, response);
            } else if (action.actionId === "button2") {
                console.log("button2 pressed");
                let engageID = action.notification.extra.data.Context.Engage_ID;
                let response = action.notification.extra.data.Push.Response.Button_Lf;                
                this.responseFulfillment(engageID, response);
            } else if (action.actionId === "button3") {
                console.log("button3 pressed");
                let engageID = action.notification.extra.data.Context.Engage_ID;
                let response = action.notification.extra.data.Push.Response.Button_Lf;                
                this.responseFulfillment(engageID, response);
            } else {
                console.log("Unexpected action");
            }
        });
    }

    private preparePushJSON(pushData) {
        let processedData: any = {};
        // Firebase compressed nested fields into strings. parse strings back into nested fields
        if (pushData.Context) {
            processedData.Context = JSON.parse(pushData.Context);
        }
        if (pushData.Push) {
            processedData.Push = JSON.parse(pushData.Push);
        }
        if (pushData.Denied) {
            processedData.Denied = JSON.parse(pushData.Denied);
        }
        return processedData;
    }

    private async processPush(pushData) {
        if (!pushData.Push) {
            console.log("Push empty in JSON. Stopping processing of push.");
            if (this.model.showPush) {
                alert("Push empty in JSON. Stopping processing of push.");
            }
            return;
        }
        if (!pushData.Context) {
            console.log("Missing Context field. Stopping processing of push.");
            if (this.model.showPush) {
                alert("Missing Context field. Stopping processing of push.");
            }
            return;
        }
        let engageID = pushData.Context.Engage_ID;
        if (engageID == null) {
            console.log("Engage ID field null. Stopping processing of push.");
            if (this.model.showPush) {
                alert("Engage ID field null. Stopping processing of push.");
            }
            return;
        }

        let ff: Fulfillment = await this.database.loadFF(engageID);
        if (ff == null) {
            console.log("Could not find campaign corresponding to engage ID: " + engageID + ". Stopping processing of push.");
            if (this.model.showPush) {
                alert("Could not find campaign corresponding to engage ID: " + engageID + ". Stopping processing of push.");
            }
            return;
        }

        let transactionStatus = pushData.Push.Trans_Sts;
        if (!transactionStatus) {
            console.log("Trans_Sts not found. Stopping processing of push.");
            if (this.model.showPush) {
                alert("Trans_Sts not found. Stopping processing of push.");
            }
            return;
        }

        // reg approved
        switch (transactionStatus) {
            case "Register-Approved":
                console.log("Found register approved key.");

                if (ff.state == FFState.SUBMITTED || ff.state == FFState.AT_LIMIT) {
                    console.log("Fulfillment is in state submitted. Updating to registered.");

                    ff.state = FFState.REGISTERED;
                    this.database.saveFF(ff);

                    // update promo status if applicable
                    if (ff.getRedeemMethod() == RedeemMethod.SELF || ff.getRedeemMethod() == RedeemMethod.TRACKER) {
                        console.log("Updating promo redeemMethodAllowed to true");
                        let promos = this.database.loadPromos();
                        let filteredPromos = (await promos).filter((promo) => {
                            return promo.parentID === ff.databaseID;
                        });
                        filteredPromos.forEach(filteredPromo => {
                            filteredPromo.redeemMethodAllowed = true;
                            this.database.savePromo(filteredPromo);
                        });

                    }
                    return;
                }
                console.log("Fulfillment is not in submitted state. Stopping processing of push.");
                if (this.model.showPush) {
                    alert("Fulfillment update state is not in submitted. State is: " + ff.state + ". Stopping processing of push");
                }
                return;
            case "Register-Denied":
                console.log("Found register denied key.");

                if (ff.state == FFState.SUBMITTED) {
                    console.log("Fulfillment is in state submitted. Updating to at limit.");

                    ff.state = FFState.AT_LIMIT;
                    this.database.saveFF(ff);
                    return;
                }
                console.log("Fulfillment is not in submitted state. Stopping processing of push.");
                if (this.model.showPush) {
                    alert("Fulfillment update state is not in submitted. State is: " + ff.state + ". Stopping processing of push");
                }
                return;
            case "Cancel-Approved":
                console.log("Found cancel approved key. Updating fulfillment to cancelled.");
                // ff.state = FFState.CANCELED;
                ff.setCancelState(CancelState.APPROVED);
                if (ff.isPromo()) {
                    for (let promoID of ff.promoIDs) {
                        let promo = await this.database.loadPromo(promoID);
                        // promo.redeemStatus = RedeemStatus.CANCELED;
                        await this.database.savePromo(promo);
                    }
                }
                this.database.saveFF(ff);
                return;
            case "Cancel-Denied":
                console.log("Found cancel denied key");
                ff.setCancelState(CancelState.DENIED);
                this.database.saveFF(ff);
                return;
            case "Update-Approved":
                console.log("Found update approved key.");
                if (ff.getUpdateState() == UpdateState.SUBMITTED) {
                    console.log("Fulfillment update state is in submitted. Updating to approved");

                    ff.setUpdateState(UpdateState.APPROVED);
                    this.database.saveFF(ff);
                    return;
                }
                console.log("Fulfillment update state is not in submitted. State is: " + ff.getUpdateState() + ". Stopping processing of push");
                if (this.model.showPush) {
                    alert("Fulfillment update state is not in submitted. State is: " + ff.getUpdateState() + ". Stopping processing of push");
                }
                return;
            case "Update-Denied":
                console.log("Found update denied key.");
                if (ff.getUpdateState() == UpdateState.SUBMITTED) {
                    console.log("Fulfillment update state is in submitted. Updating to denied");

                    ff.setUpdateState(UpdateState.DENIED);
                    this.database.saveFF(ff);
                    return;
                }
                console.log("Fulfillment update state is not in submitted. State is: " + ff.getUpdateState() + ". Stopping processing of push");
                if (this.model.showPush) {
                    alert("Fulfillment update state is not in submitted. State is: " + ff.getUpdateState() + ". Stopping processing of push");
                }
                return;
            default:
                console.log("Transaction status not supported: " + transactionStatus + " Stopping processing of push.");
                if (this.model.showPush) {
                    alert("Transaction status not supported: " + transactionStatus + " Stopping processing of push.");
                }
                return;
        }
    }

    private async buildNotification(pushData) {
        if (!pushData.Push) {
            console.log("Push empty in JSON. Skipping notification creation");
            if (this.model.showPush) {
                alert("Push empty in JSON. Skipping notification creation");
            }
            return;
        }
        if (!pushData.Push.Body || pushData.Push.Body.trim() === "") {
            console.log("Body is empty in push. Skippping notification creation");
            if (this.model.showPush) {
                alert("Body is empty in push. Skippping notification creation");
            }
            return;
        }

        let pushJSON = pushData.Push;

        let title = pushJSON.Title;
        let body = this.generatePushMessage(pushData);

        let notificationStructure: LocalNotificationSchema = {
            title: title,
            body: body,
            id: Date.now(),
            extra: {
                data: pushData
            }
        };

        if (pushJSON.Response) {
            let actionArr = []
            if (pushJSON.Response.Button_Lf) {
                actionArr.push({ id: "button1", title: pushJSON.Response.Button_Lf });
            }
            if (pushJSON.Response.Button_Ctr) {
                actionArr.push({ id: "button2", title: pushJSON.Response.Button_Ctr });
            }
            if (pushJSON.Response.Button_Rt) {
                actionArr.push({ id: "button3", title: pushJSON.Response.Button_Rt });
            }

            LocalNotifications.registerActionTypes({
                types: [
                    {
                        id: "buttons",
                        actions: actionArr
                    }
                ]
            });

            notificationStructure.actionTypeId = "buttons";
        }

        console.log("Built notification");
        await LocalNotifications.schedule({
            notifications: [
                notificationStructure
            ]
        })
    }

    private generatePushMessage(pushData): string {
        let message = pushData.Push.Body;
        if (pushData.Denied && pushData.Denied.Reason_Denied && pushData.Denied.Reason_Denied.trim() != "") {
            message += " " + pushData.Denied.Reason_Denied;
        }
        if (pushData.Push.Quest && pushData.Push.Quest.trim() != "") {
            message += " " + pushData.Push.Quest;
        }
        return message;
    }

    async displayPushAsAlert(pushData) {
        let pushJSON = pushData.Push;
        let header = pushJSON.Title;
        let message = this.generatePushMessage(pushData);

        const alert = document.createElement('ion-alert');
        alert.header = header;
        alert.message = message;

        if (pushJSON.Response) {
            if (pushJSON.Response.Text_Lbl) {
                alert.inputs = [{
                    name: 'textInput',
                    type: 'text',
                    placeholder: pushJSON.Response.Text_Lbl
                }];
                alert.buttons = [
                    "Cancel",
                    {
                        text: "Submit",
                        handler: (data) => {
                            console.log("Got response: " + data.textInput);
                            let engageID = pushData.Context.Engage_ID;
                            let response = data.textInput;
                            this.responseFulfillment(engageID, response);
                        }
                    }
                ];
            } else {
                let buttons = []
                if (pushJSON.Response.Button_Lf) {
                    buttons.push({
                        text: pushJSON.Response.Button_Lf,
                        handler: () => {
                            console.log("Button_Lf pressed");
                            let engageID = pushData.Context.Engage_ID;
                            let response = pushData.Push.Response.Button_Lf;
                            this.responseFulfillment(engageID, response);
                        }
                    });
                }
                if (pushJSON.Response.Button_Ctr) {
                    buttons.push({
                        text: pushJSON.Response.Button_Ctr,
                        handler: () => {
                            console.log("Button_Ctr pressed");
                            let engageID = pushData.Context.Engage_ID;
                            let response = pushData.Push.Response.Button_Ctr;
                            this.responseFulfillment(engageID, response);
                        }
                    });
                }
                if (pushJSON.Response.Button_Rt) {
                    buttons.push({
                        text: pushJSON.Response.Button_Rt,
                        handler: () => {
                            console.log("Button_Rt pressed");
                            let engageID = pushData.Context.Engage_ID;
                            let response = pushData.Push.Response.Button_Rt;
                            this.responseFulfillment(engageID, response);
                        }
                    });
                }
                buttons.push("Cancel");
                alert.buttons = buttons;
            }
        } else {
            alert.buttons = ["Okay"];
        }

        document.body.appendChild(alert);
        return alert.present();
    }

    private responseFulfillment(engageID: string, response: string) {
        this.database.loadFF(engageID).then(ff => {
            if (ff === null) {
                console.log("Could not load associated fulfillment.");
                return;
            }
            ff.ffAction = FFAction.ACTIONABLE;
            ff.setActionResponse(response);
            this.ffService.addFulfillment(ff);
        })
    }

    async scheduleBasic() {
        LocalNotifications.registerActionTypes({
            types: [
                {
                    id: "buttons",
                    actions: [
                        {
                            id: "button1",
                            title: "Button 1"
                        },
                        {
                            id: "button2",
                            title: "Button 2"
                        },
                        {
                            id: "button3",
                            title: "Button 3"
                        }
                    ]
                }
            ]
        });
        await LocalNotifications.schedule({
            notifications: [
                {
                    title: "Title",
                    body: "Body",
                    id: 1,
                    extra: {
                        data: "example data"
                    },
                    actionTypeId: 'buttons'
                }
            ]
        })
    }
}