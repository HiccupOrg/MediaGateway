import * as dotenv from "dotenv";
import process from "node:process";
import assert from "node:assert";

export interface Settings {
    ServiceId: string;
    MediaServerHost: string;
    MediaServerPort: number;
    MediaEnableTCP: boolean;
    MediaEnableUDP: boolean;
    PublicIPAddress: string;
    PublicDomain?: string;
    SignalServerHost: string;
    SignalServerPort: number;
    RegistryURL: string;
    ServiceToken: string;
    RegisterServiceInterval: number;
}


export function loadSettings(): Settings {
    dotenv.config({
        encoding: "utf-8",
        override: true,
        debug: process.env.DEBUG?.toLowerCase() == "true",
    });

    assert(process.env.REGISTRY_URL !== undefined, "Registry URL must be set");
    assert(process.env.PUBLIC_IP_ADDRESS !== undefined, "Registry URL must be set");

    return {
        ServiceId: process.env.SERVICE_ID || generateCustomRandomString(8),
        MediaServerHost: process.env.MEDIA_SERVER_HOST || "127.0.0.1",
        MediaServerPort: parseInt(process.env.MEDIA_SERVER_PORT || "1441"),
        MediaEnableTCP: process.env.MEDIA_ENABLE_TCP?.toLowerCase() == "true",
        MediaEnableUDP: process.env.MEDIA_ENABLE_UDP?.toLowerCase() == "true",
        PublicIPAddress: process.env.PUBLIC_IP_ADDRESS!,
        SignalServerHost: process.env.SIGNAL_SERVER_HOST || "127.0.0.1",
        SignalServerPort: parseInt(process.env.SIGNAL_SERVER_PORT || "1441"),
        RegistryURL: process.env.REGISTRY_URL,
        ServiceToken: process.env.SERVICE_TOKEN || "",
        PublicDomain: process.env.PUBLIC_DOMAIN,
        RegisterServiceInterval: parseInt(process.env.REGISTER_SERVER_INTERVAL || "30"),
    };
}

export function generateCustomRandomString(length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$*%&^()') {
    let result = '';
    const charactersLength = chars.length;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


export const Setting = loadSettings();
