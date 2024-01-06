import { NgModule } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';
import { BrowserModule } from '@angular/platform-browser';
import { Contacts } from '@ionic-native/contacts/ngx';

import { IonicStorageModule } from '@ionic/storage';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { SQLite } from '@ionic-native/sqlite/ngx';
import { Calendar } from '@ionic-native/calendar/ngx';
import { Vibration } from '@ionic-native/vibration/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
// import { QRScanner } from '@ionic-native/qr-scanner/ngx';
// import { Flashlight } from '@ionic-native/flashlight/ngx';
// import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { UniqueDeviceID } from '@ionic-native/unique-device-id/ngx';
import { Keyboard } from '@ionic-native/keyboard/ngx';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
// import { LocalNotifications } from "@ionic-native/local-notifications/ngx";
// import { } from "@capacitor/push-notifications";

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

import { ScanPageModule } from './modals/scan/scan.module';
import { StandardQRModule } from './modals/standardqr/standardqr.module';
import { SurveyModule } from './modals/survey/survey.module';
import { HelpPageModule } from './pages/help/help.module';
import { AboutPageModule } from './pages/about/about.module';
import { SetupPageModule } from './modals/setup/setup.module';
import { PromoPageModule } from './pages/promo/promo.module';
import { SystemPageModule } from './pages/system/system.module';
import { ProfilePageModule } from './pages/profile/profile.module';
import { HistoryPageModule } from './pages/history/history.module';
import { PendingPageModule } from './pages/pending/pending.module';
import { ApprovalPageModule } from './pages/approval/approval.module';
import { FfDetailsPageModule } from './modals/ff-details/ff-details.module';
import { PromoDetailsPageModule } from './modals/promo-details/promo-details.module';

import { ComponentsModule } from './components/components.module';
import { FFPopoverComponent } from './components/ff-popover/ff-popover.component';
import { FfEditPopoverComponent } from './components/ff-edit-popover/ff-edit-popover.component';
import { CalSelectPopoverComponent } from './components/cal-select-popover/cal-select-popover.component';
import { CompositeDescPopoverComponent } from './components/composite-desc-popover/composite-desc-popover.component';
import { PopoverComponent } from './components/popover/popover.component';
// import { WifiWizard2 } from '@ionic-native/wifi-wizard-2/ngx';
import { Device } from '@ionic-native/device/ngx';
import { EventWGuestModule } from './modals/eventwguest/eventwguest.module';
import { HttpClientModule, HttpClient } from "@angular/common/http";
//import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
//import { TranslateHttpLoader } from "@ngx-translate/http-loader";

// https://www.djamware.com/post/631719a902bb4f02ac0dab1d/ionic-angular-tutorial-multilanguage-app-using-angular-i18n

@NgModule({
  declarations: [
    AppComponent
  ],
  entryComponents: [
    FFPopoverComponent,
    CompositeDescPopoverComponent,
    FfEditPopoverComponent,
    CalSelectPopoverComponent,
    PopoverComponent
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot({
      scrollAssist: true,
      // animated: false;
    }),
    HttpClientModule,
    IonicStorageModule.forRoot(),
    AppRoutingModule,
    ApprovalPageModule,
    HistoryPageModule,
    SetupPageModule,
    ProfilePageModule,
    PendingPageModule,
    ComponentsModule,
    SystemPageModule,
    AboutPageModule,
    PromoPageModule,
    HelpPageModule,
    ScanPageModule,
    FfDetailsPageModule,
    PromoDetailsPageModule,
    StandardQRModule,
    SurveyModule,
    EventWGuestModule
  ],
  providers: [
    UniqueDeviceID,
    Device,
    SocialSharing,
    // SplashScreen,
    Vibration,
    Contacts,
    // WifiWizard2,
    // Flashlight,
    // QRScanner,
    StatusBar,
    Calendar,
    SQLite,
    Keyboard,
    Clipboard,
    InAppBrowser,
    // LocalNotifications,
    {
      provide: RouteReuseStrategy,
      useClass: IonicRouteStrategy
    }
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }
