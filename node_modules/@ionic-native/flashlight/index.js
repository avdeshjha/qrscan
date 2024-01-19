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
var FlashlightOriginal = /** @class */ (function (_super) {
    __extends(FlashlightOriginal, _super);
    function FlashlightOriginal() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FlashlightOriginal.prototype.available = function () { return cordova(this, "available", {}, arguments); };
    FlashlightOriginal.prototype.switchOn = function () { return cordova(this, "switchOn", {}, arguments); };
    FlashlightOriginal.prototype.switchOff = function () { return cordova(this, "switchOff", {}, arguments); };
    FlashlightOriginal.prototype.toggle = function () { return cordova(this, "toggle", {}, arguments); };
    FlashlightOriginal.prototype.isSwitchedOn = function () { return cordova(this, "isSwitchedOn", { "sync": true }, arguments); };
    FlashlightOriginal.pluginName = "Flashlight";
    FlashlightOriginal.plugin = "cordova-plugin-flashlight";
    FlashlightOriginal.pluginRef = "window.plugins.flashlight";
    FlashlightOriginal.repo = "https://github.com/EddyVerbruggen/Flashlight-PhoneGap-Plugin";
    FlashlightOriginal.platforms = ["Android", "iOS", "Windows Phone 8"];
    return FlashlightOriginal;
}(IonicNativePlugin));
var Flashlight = new FlashlightOriginal();
export { Flashlight };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvQGlvbmljLW5hdGl2ZS9wbHVnaW5zL2ZsYXNobGlnaHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7OztBQUNBLE9BQU8sOEJBQXNDLE1BQU0sb0JBQW9CLENBQUM7O0lBNEJ4Qyw4QkFBaUI7Ozs7SUFPL0MsOEJBQVM7SUFTVCw2QkFBUTtJQVNSLDhCQUFTO0lBU1QsMkJBQU07SUFZTixpQ0FBWTs7Ozs7O3FCQTNFZDtFQTZCZ0MsaUJBQWlCO1NBQXBDLFVBQVUiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBJbmplY3RhYmxlIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5pbXBvcnQgeyBDb3Jkb3ZhLCBJb25pY05hdGl2ZVBsdWdpbiwgUGx1Z2luIH0gZnJvbSAnQGlvbmljLW5hdGl2ZS9jb3JlJztcblxuLyoqXG4gKiBAbmFtZSBGbGFzaGxpZ2h0XG4gKiBAZGVzY3JpcHRpb24gVGhpcyBwbHVnaW4gYWxsb3dzIHlvdSB0byBzd2l0Y2ggdGhlIGZsYXNobGlnaHQgLyB0b3JjaCBvZiB0aGUgZGV2aWNlIG9uIGFuZCBvZmYuXG4gKlxuICogUmVxdWlyZXMgQ29yZG92YSBwbHVnaW46IGBjb3Jkb3ZhLXBsdWdpbi1mbGFzaGxpZ2h0YC4gRm9yIG1vcmUgaW5mbywgcGxlYXNlIHNlZSB0aGUgW0ZsYXNobGlnaHQgcGx1Z2luIGRvY3NdKGh0dHBzOi8vZ2l0aHViLmNvbS9FZGR5VmVyYnJ1Z2dlbi9GbGFzaGxpZ2h0LVBob25lR2FwLVBsdWdpbikuXG4gKlxuICogQHVzYWdlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBpbXBvcnQgeyBGbGFzaGxpZ2h0IH0gZnJvbSAnQGlvbmljLW5hdGl2ZS9mbGFzaGxpZ2h0L25neCc7XG4gKlxuICogY29uc3RydWN0b3IocHJpdmF0ZSBmbGFzaGxpZ2h0OiBGbGFzaGxpZ2h0KSB7IH1cbiAqXG4gKiAuLi5cbiAqXG4gKiB0aGlzLmZsYXNobGlnaHQuc3dpdGNoT24oKTtcbiAqXG4gKiBgYGBcbiAqL1xuQFBsdWdpbih7XG4gIHBsdWdpbk5hbWU6ICdGbGFzaGxpZ2h0JyxcbiAgcGx1Z2luOiAnY29yZG92YS1wbHVnaW4tZmxhc2hsaWdodCcsXG4gIHBsdWdpblJlZjogJ3dpbmRvdy5wbHVnaW5zLmZsYXNobGlnaHQnLFxuICByZXBvOiAnaHR0cHM6Ly9naXRodWIuY29tL0VkZHlWZXJicnVnZ2VuL0ZsYXNobGlnaHQtUGhvbmVHYXAtUGx1Z2luJyxcbiAgcGxhdGZvcm1zOiBbJ0FuZHJvaWQnLCAnaU9TJywgJ1dpbmRvd3MgUGhvbmUgOCddXG59KVxuQEluamVjdGFibGUoKVxuZXhwb3J0IGNsYXNzIEZsYXNobGlnaHQgZXh0ZW5kcyBJb25pY05hdGl2ZVBsdWdpbiB7XG5cbiAgLyoqXG4gICAqIENoZWNrcyBpZiB0aGUgZmxhc2hsaWdodCBpcyBhdmFpbGFibGVcbiAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59IFJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCBhIGJvb2xlYW4gc3RhdGluZyBpZiB0aGUgZmxhc2hsaWdodCBpcyBhdmFpbGFibGUuXG4gICAqL1xuICBAQ29yZG92YSgpXG4gIGF2YWlsYWJsZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogU3dpdGNoZXMgdGhlIGZsYXNobGlnaHQgb25cbiAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59XG4gICAqL1xuICBAQ29yZG92YSgpXG4gIHN3aXRjaE9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTd2l0Y2hlcyB0aGUgZmxhc2hsaWdodCBvZmZcbiAgICogQHJldHVybnMge1Byb21pc2U8Ym9vbGVhbj59XG4gICAqL1xuICBAQ29yZG92YSgpXG4gIHN3aXRjaE9mZigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvKipcbiAgICogVG9nZ2xlcyB0aGUgZmxhc2hsaWdodFxuICAgKiBAcmV0dXJucyB7UHJvbWlzZTxhbnk+fVxuICAgKi9cbiAgQENvcmRvdmEoKVxuICB0b2dnbGUoKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm47XG4gIH1cblxuXG4gIC8qKlxuICAgKiBDaGVja3MgaWYgdGhlIGZsYXNobGlnaHQgaXMgdHVybmVkIG9uLlxuICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICovXG4gIEBDb3Jkb3ZhKHtcbiAgICBzeW5jOiB0cnVlXG4gIH0pXG4gIGlzU3dpdGNoZWRPbigpOiBib29sZWFuIHtcbiAgICByZXR1cm47XG4gIH1cblxufVxuIl19