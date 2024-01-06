//
//  RemotePush.swift
//  App
//
//  Created by Joseph Yang on 10/20/21.
//

import Foundation
import Capacitor

@objc(RemotePush)
public class RemotePush: CAPPlugin {
    
    public override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(self.handleDataMessage(notification:)), name: Notification.Name("OnRemoteMessage"), object: nil)
    }

    @objc func handleDataMessage( notification: NSNotification) {
        let userInfo: [AnyHashable : Any]
        userInfo = notification.object as! [AnyHashable : Any]
        print("Entire message \(userInfo)")
        self.notifyListeners("OnRemoteNotification", data: ["data":userInfo])
    }
}
