import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  constructor() { 
    console.log('TIMESERVICE');
  }

  public beforeNow() {
    return true;
  }

}