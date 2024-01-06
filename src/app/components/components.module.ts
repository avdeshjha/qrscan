import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { CompositeDescPopoverComponent } from './composite-desc-popover/composite-desc-popover.component';
import { CalSelectPopoverComponent } from './cal-select-popover/cal-select-popover.component';
import { FfEditPopoverComponent } from './ff-edit-popover/ff-edit-popover.component';
import { FulfillmentComponent } from './fulfillment/fulfillment.component';
import { FFPopoverComponent } from './ff-popover/ff-popover.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { SymbolComponent } from './symbol/symbol.component';
import { PopoverComponent } from './popover/popover.component';
// MultiLanguage
// import { TranslateModule } from '@ngx-translate/core';

@NgModule({
	imports: [
		CommonModule,
		FormsModule,
		IonicModule,
		// TranslateModule - MultiLanguage
	],
	providers: [
	],
	declarations: [
		FFPopoverComponent,
		CalSelectPopoverComponent,
		FfEditPopoverComponent,
		CompositeDescPopoverComponent,
		HeaderComponent,
		FooterComponent,
		FulfillmentComponent,
		SymbolComponent,
		PopoverComponent
	],
	exports: [
		FfEditPopoverComponent,
		CompositeDescPopoverComponent,
		CalSelectPopoverComponent,
		FFPopoverComponent,
		HeaderComponent,
		FooterComponent,
		FulfillmentComponent,
		SymbolComponent,
		PopoverComponent
	]
})
export class ComponentsModule { }
