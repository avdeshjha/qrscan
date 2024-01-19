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
import { IonicNativePlugin, cordova } from '@ionic-native/core';
var UniqueDeviceIDOriginal = /** @class */ (function (_super) {
    __extends(UniqueDeviceIDOriginal, _super);
    function UniqueDeviceIDOriginal() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UniqueDeviceIDOriginal.prototype.get = function () { return cordova(this, "get", {}, arguments); };
    UniqueDeviceIDOriginal.pluginName = "UniqueDeviceID";
    UniqueDeviceIDOriginal.plugin = "cordova-plugin-uniquedeviceid";
    UniqueDeviceIDOriginal.pluginRef = "window.plugins.uniqueDeviceID";
    UniqueDeviceIDOriginal.repo = "https://github.com/Paldom/UniqueDeviceID";
    UniqueDeviceIDOriginal.platforms = ["Android", "iOS", "Windows Phone 8"];
    return UniqueDeviceIDOriginal;
}(IonicNativePlugin));
var UniqueDeviceID = new UniqueDeviceIDOriginal();
export { UniqueDeviceID };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvQGlvbmljLW5hdGl2ZS9wbHVnaW5zL3VuaXF1ZS1kZXZpY2UtaWQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUFBLE9BQU8sOEJBQXNDLE1BQU0sb0JBQW9CLENBQUM7O0lBOEJwQyxrQ0FBaUI7Ozs7SUFPbkQsNEJBQUc7Ozs7Ozt5QkFyQ0w7RUE4Qm9DLGlCQUFpQjtTQUF4QyxjQUFjIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29yZG92YSwgSW9uaWNOYXRpdmVQbHVnaW4sIFBsdWdpbiB9IGZyb20gJ0Bpb25pYy1uYXRpdmUvY29yZSc7XG5pbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbi8qKlxuICogQG5hbWUgVW5pcXVlIERldmljZSBJRFxuICogQGRlc2NyaXB0aW9uXG4gKiBUaGlzIHBsdWdpbiBwcm9kdWNlcyBhIHVuaXF1ZSwgY3Jvc3MtaW5zdGFsbCwgYXBwLXNwZWNpZmljIGRldmljZSBpZC5cbiAqXG4gKiBAdXNhZ2VcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IFVuaXF1ZURldmljZUlEIH0gZnJvbSAnQGlvbmljLW5hdGl2ZS91bmlxdWUtZGV2aWNlLWlkL25neCc7XG4gKlxuICogY29uc3RydWN0b3IocHJpdmF0ZSB1bmlxdWVEZXZpY2VJRDogVW5pcXVlRGV2aWNlSUQpIHsgfVxuICpcbiAqIC4uLlxuICpcbiAqIHRoaXMudW5pcXVlRGV2aWNlSUQuZ2V0KClcbiAqICAgLnRoZW4oKHV1aWQ6IGFueSkgPT4gY29uc29sZS5sb2codXVpZCkpXG4gKiAgIC5jYXRjaCgoZXJyb3I6IGFueSkgPT4gY29uc29sZS5sb2coZXJyb3IpKTtcbiAqXG4gKiBgYGBcbiAqL1xuQFBsdWdpbih7XG4gIHBsdWdpbk5hbWU6ICdVbmlxdWVEZXZpY2VJRCcsXG4gIHBsdWdpbjogJ2NvcmRvdmEtcGx1Z2luLXVuaXF1ZWRldmljZWlkJyxcbiAgcGx1Z2luUmVmOiAnd2luZG93LnBsdWdpbnMudW5pcXVlRGV2aWNlSUQnLFxuICByZXBvOiAnaHR0cHM6Ly9naXRodWIuY29tL1BhbGRvbS9VbmlxdWVEZXZpY2VJRCcsXG4gIHBsYXRmb3JtczogWydBbmRyb2lkJywgJ2lPUycsICdXaW5kb3dzIFBob25lIDgnXVxufSlcbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBVbmlxdWVEZXZpY2VJRCBleHRlbmRzIElvbmljTmF0aXZlUGx1Z2luIHtcblxuICAvKipcbiAgICogR2V0cyBhIHVuaXF1ZSwgY3Jvc3MtaW5zdGFsbCwgYXBwLXNwZWNpZmljIGRldmljZSBpZC5cbiAgICogQHJldHVybiB7UHJvbWlzZTxzdHJpbmc+fSBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gc29tZXRoaW5nIGhhcHBlbnNcbiAgICovXG4gIEBDb3Jkb3ZhKClcbiAgZ2V0KCk6IFByb21pc2U8c3RyaW5nPiB7XG4gICAgcmV0dXJuO1xuICB9XG5cbn1cbiJdfQ==