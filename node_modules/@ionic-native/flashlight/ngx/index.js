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
import { Injectable } from '@angular/core';
import { IonicNativePlugin, cordova } from '@ionic-native/core';
var Flashlight = /** @class */ (function (_super) {
    __extends(Flashlight, _super);
    function Flashlight() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Flashlight.prototype.available = function () { return cordova(this, "available", {}, arguments); };
    Flashlight.prototype.switchOn = function () { return cordova(this, "switchOn", {}, arguments); };
    Flashlight.prototype.switchOff = function () { return cordova(this, "switchOff", {}, arguments); };
    Flashlight.prototype.toggle = function () { return cordova(this, "toggle", {}, arguments); };
    Flashlight.prototype.isSwitchedOn = function () { return cordova(this, "isSwitchedOn", { "sync": true }, arguments); };
    Flashlight.pluginName = "Flashlight";
    Flashlight.plugin = "cordova-plugin-flashlight";
    Flashlight.pluginRef = "window.plugins.flashlight";
    Flashlight.repo = "https://github.com/EddyVerbruggen/Flashlight-PhoneGap-Plugin";
    Flashlight.platforms = ["Android", "iOS", "Windows Phone 8"];
    Flashlight = __decorate([
        Injectable()
    ], Flashlight);
    return Flashlight;
}(IonicNativePlugin));
export { Flashlight };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvQGlvbmljLW5hdGl2ZS9wbHVnaW5zL2ZsYXNobGlnaHQvbmd4L2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzNDLE9BQU8sOEJBQXNDLE1BQU0sb0JBQW9CLENBQUM7O0lBNEJ4Qyw4QkFBaUI7Ozs7SUFPL0MsOEJBQVM7SUFTVCw2QkFBUTtJQVNSLDhCQUFTO0lBU1QsMkJBQU07SUFZTixpQ0FBWTs7Ozs7O0lBOUNELFVBQVU7UUFEdEIsVUFBVSxFQUFFO09BQ0EsVUFBVTtxQkE3QnZCO0VBNkJnQyxpQkFBaUI7U0FBcEMsVUFBVSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUgfSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IENvcmRvdmEsIElvbmljTmF0aXZlUGx1Z2luLCBQbHVnaW4gfSBmcm9tICdAaW9uaWMtbmF0aXZlL2NvcmUnO1xuXG4vKipcbiAqIEBuYW1lIEZsYXNobGlnaHRcbiAqIEBkZXNjcmlwdGlvbiBUaGlzIHBsdWdpbiBhbGxvd3MgeW91IHRvIHN3aXRjaCB0aGUgZmxhc2hsaWdodCAvIHRvcmNoIG9mIHRoZSBkZXZpY2Ugb24gYW5kIG9mZi5cbiAqXG4gKiBSZXF1aXJlcyBDb3Jkb3ZhIHBsdWdpbjogYGNvcmRvdmEtcGx1Z2luLWZsYXNobGlnaHRgLiBGb3IgbW9yZSBpbmZvLCBwbGVhc2Ugc2VlIHRoZSBbRmxhc2hsaWdodCBwbHVnaW4gZG9jc10oaHR0cHM6Ly9naXRodWIuY29tL0VkZHlWZXJicnVnZ2VuL0ZsYXNobGlnaHQtUGhvbmVHYXAtUGx1Z2luKS5cbiAqXG4gKiBAdXNhZ2VcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGltcG9ydCB7IEZsYXNobGlnaHQgfSBmcm9tICdAaW9uaWMtbmF0aXZlL2ZsYXNobGlnaHQvbmd4JztcbiAqXG4gKiBjb25zdHJ1Y3Rvcihwcml2YXRlIGZsYXNobGlnaHQ6IEZsYXNobGlnaHQpIHsgfVxuICpcbiAqIC4uLlxuICpcbiAqIHRoaXMuZmxhc2hsaWdodC5zd2l0Y2hPbigpO1xuICpcbiAqIGBgYFxuICovXG5AUGx1Z2luKHtcbiAgcGx1Z2luTmFtZTogJ0ZsYXNobGlnaHQnLFxuICBwbHVnaW46ICdjb3Jkb3ZhLXBsdWdpbi1mbGFzaGxpZ2h0JyxcbiAgcGx1Z2luUmVmOiAnd2luZG93LnBsdWdpbnMuZmxhc2hsaWdodCcsXG4gIHJlcG86ICdodHRwczovL2dpdGh1Yi5jb20vRWRkeVZlcmJydWdnZW4vRmxhc2hsaWdodC1QaG9uZUdhcC1QbHVnaW4nLFxuICBwbGF0Zm9ybXM6IFsnQW5kcm9pZCcsICdpT1MnLCAnV2luZG93cyBQaG9uZSA4J11cbn0pXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgRmxhc2hsaWdodCBleHRlbmRzIElvbmljTmF0aXZlUGx1Z2luIHtcblxuICAvKipcbiAgICogQ2hlY2tzIGlmIHRoZSBmbGFzaGxpZ2h0IGlzIGF2YWlsYWJsZVxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn0gUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIGEgYm9vbGVhbiBzdGF0aW5nIGlmIHRoZSBmbGFzaGxpZ2h0IGlzIGF2YWlsYWJsZS5cbiAgICovXG4gIEBDb3Jkb3ZhKClcbiAgYXZhaWxhYmxlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTd2l0Y2hlcyB0aGUgZmxhc2hsaWdodCBvblxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn1cbiAgICovXG4gIEBDb3Jkb3ZhKClcbiAgc3dpdGNoT24oKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLyoqXG4gICAqIFN3aXRjaGVzIHRoZSBmbGFzaGxpZ2h0IG9mZlxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxib29sZWFuPn1cbiAgICovXG4gIEBDb3Jkb3ZhKClcbiAgc3dpdGNoT2ZmKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUb2dnbGVzIHRoZSBmbGFzaGxpZ2h0XG4gICAqIEByZXR1cm5zIHtQcm9taXNlPGFueT59XG4gICAqL1xuICBAQ29yZG92YSgpXG4gIHRvZ2dsZSgpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgZmxhc2hsaWdodCBpcyB0dXJuZWQgb24uXG4gICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgKi9cbiAgQENvcmRvdmEoe1xuICAgIHN5bmM6IHRydWVcbiAgfSlcbiAgaXNTd2l0Y2hlZE9uKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybjtcbiAgfVxuXG59XG4iXX0=