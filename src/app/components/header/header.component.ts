import { Component, Input, Output, EventEmitter } from '@angular/core';
import {PopoverController } from '@ionic/angular';
import { ModelService } from 'src/app/services/model.service';

@Component({
  selector: 'header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {

  //template control
  @Output()
  public back = new EventEmitter<void>();

  @Input() // could also be @Output()s
  public editCallbacks: [() => void, () => void];

  @Input()
  public editContext: boolean;
  
  @Input()
  public disableControls: boolean = false

  @Output()
  public more = new EventEmitter<void>();

  @Input()
  public showMore: boolean = false

  constructor(
    public popoverController: PopoverController,
    public model: ModelService,
  ) {}

  showBack(): boolean {
    return this.back.observers.length > 0;
  }

  toggleEdit() {
    if (this.editContext) {
      this.editCallbacks[1]();
    } else {
      this.editCallbacks[0]();
    }
  }

}