import { registerPlugin, Plugin } from "@capacitor/core";

interface NativePluginInterface extends Plugin {
    NativeMethod: () => Promise<Record<"data", string>>;
    NotifyListeners: () => Promise<void>;
}

export const RemotePush = registerPlugin<NativePluginInterface> (
    "RemotePush"
);