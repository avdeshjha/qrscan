//
//  RemotePush.m
//  App
//
//  Created by Joseph Yang on 10/20/21.
//

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(RemotePush, "RemotePush",
           CAP_PLUGIN_METHOD(NativeMethod, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(NotifyListeners, CAPPluginReturnPromise);
)
