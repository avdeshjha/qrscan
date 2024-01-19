var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { IonicNativePlugin, cordova } from '@ionic-native/core';
import { Injectable } from '@angular/core';
var UniqueDeviceID = /** @class */ (function (_super) {
    __extends(UniqueDeviceID, _super);
    function UniqueDeviceID() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UniqueDeviceID.prototype.get = function () { return cordova(this, "get", {}, arguments); };
    UniqueDeviceID.pluginName = "UniqueDeviceID";
    UniqueDeviceID.plugin = "cordova-plugin-uniquedeviceid";
    UniqueDeviceID.pluginRef = "window.plugins.uniqueDeviceID";
    UniqueDeviceID.repo = "https://github.com/Paldom/UniqueDeviceID";
    UniqueDeviceID.platforms = ["Android", "iOS", "Windows Phone 8"];
    UniqueDeviceID = __decorate([
        Injectable()
    ], UniqueDeviceID);
    return UniqueDeviceID;
}(IonicNativePlugin));
export { UniqueDeviceID };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvQGlvbmljLW5hdGl2ZS9wbHVnaW5zL3VuaXF1ZS1kZXZpY2UtaWQvbmd4L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxPQUFPLDhCQUFzQyxNQUFNLG9CQUFvQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7O0lBNkJQLGtDQUFpQjs7OztJQU9uRCw0QkFBRzs7Ozs7O0lBUFEsY0FBYztRQUQxQixVQUFVLEVBQUU7T0FDQSxjQUFjO3lCQTlCM0I7RUE4Qm9DLGlCQUFpQjtTQUF4QyxjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29yZG92YSwgSW9uaWNOYXRpdmVQbHVnaW4sIFBsdWdpbiB9IGZyb20gJ0Bpb25pYy1uYXRpdmUvY29yZSc7XG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogQG5hbWUgVW5pcXVlIERldmljZSBJRFxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGlzIHBsdWdpbiBwcm9kdWNlcyBhIHVuaXF1ZSwgY3Jvc3MtaW5zdGFsbCwgYXBwLXNwZWNpZmljIGRldmljZSBpZC5cbiAqXG4gKiBAdXNhZ2VcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IFVuaXF1ZURldmljZUlEIH0gZnJvbSAnQGlvbmljLW5hdGl2ZS91bmlxdWUtZGV2aWNlLWlkL25neCc7XG4gKlxuICogY29uc3RydWN0b3IocHJpdmF0ZSB1bmlxdWVEZXZpY2VJRDogVW5pcXVlRGV2aWNlSUQpIHsgfVxuICpcbiAqIC4uLlxuICpcbiAqIHRoaXMudW5pcXVlRGV2aWNlSUQuZ2V0KClcbiAqICAgLnRoZW4oKHV1aWQ6IGFueSkgPT4gY29uc29sZS5sb2codXVpZCkpXG4gKiAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4gY29uc29sZS5sb2coZXJyb3IpKTtcbiAqXG4gKiBgYGBcbiAqL1xuQFBsdWdpbih7XG4gIHBsdWdpbk5hbWU6ICdVbmlxdWVEZXZpY2VJRCcsXG4gIHBsdWdpbjogJ2NvcmRvdmEtcGx1Z2luLXVuaXF1ZWRldmljZWlkJyxcbiAgcGx1Z2luUmVmOiAnd2luZG93LnBsdWdpbnMudW5pcXVlRGV2aWNlSUQnLFxuICByZXBvOiAnaHR0cHM6Ly9naXRodWIuY29tL1BhbGRvbS9VbmlxdWVEZXZpY2VJRCcsXG4gIHBsYXRmb3JtczogWydBbmRyb2lkJywgJ2lPUycsICdXaW5kb3dzIFBob25lIDgnXVxufSlcbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBVbmlxdWVEZXZpY2VJRCBleHRlbmRzIElvbmljTmF0aXZlUGx1Z2luIHtcblxuICAvKipcbiAgICogR2V0cyBhIHVuaXF1ZSwgY3Jvc3MtaW5zdGFsbCwgYXBwLXNwZWNpZmljIGRldmljZSBpZC5cbiAgICogQHJldHVybiB7UHJvbWlzZTxzdHJpbmc+fSBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gc29tZXRoaW5nIGhhcHBlbnNcbiAgICovXG4gIEBDb3Jkb3ZhKClcbiAgZ2V0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuO1xuICB9XG5cbn1cbiJdfQ==