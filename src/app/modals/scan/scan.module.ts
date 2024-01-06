import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { ScanPage } from './scan.page';
import { ComponentsModule } from 'src/app/components/components.module';
import { QRCodeModule } from 'angularx-qrcode';
// import { TranslateModule } from '@ngx-translate/core'; // MultiLanguage

const routes: Routes = [
  {
    path: '',
    component: ScanPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ComponentsModule,
    RouterModule.forChild(routes),
    QRCodeModule
    // TranslateModule // MultiLanguage
  ],
  declarations: [ScanPage]
})
export class ScanPageModule {}
