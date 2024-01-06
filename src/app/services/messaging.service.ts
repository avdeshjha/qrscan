import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Fulfillment } from './model.service';


export interface Queue<T> {
  publish(value: T): void,
  getObservable(): Observable<T>
}

export enum QueueName {
  FULFILLMENT,
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  behaviorSubjectQueue = class BehaviorSubjectQueue<T> implements Queue<T>{
    constructor(private initial: T) { }
    private subject = new BehaviorSubject<T>(this.initial);

    publish(value: T) {
      this.subject.next(value);
    }

    getObservable(): Observable<T> {
      return this.subject.asObservable();
    }
  }

  private queues: Map<QueueName, Queue<any>>;

  constructor() {
    this.queues = new Map<QueueName, Queue<any>>();
    //this.queues.set(QueueName.PROFILE_INPUT, new this.behaviorSubjectQueue<Symbol<SymbolType.User>[]>([]));
    this.queues.set(QueueName.FULFILLMENT, new this.behaviorSubjectQueue<Fulfillment>(null));
  }

  public getQueue(name: QueueName) {
    return this.queues.get(name);
  }

}
