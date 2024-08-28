import {loadSettings, Settings} from "./settings.js";
import {types as mediasoupTypes} from "mediasoup";
import * as mediasoup from "mediasoup";
import assert from "node:assert";

export class MediaServer {
    settings: Settings;
    worker?: mediasoupTypes.Worker;
    routers: Map<string, mediasoupTypes.Router>;
    server?: mediasoupTypes.WebRtcServer;
    transports: Map<string, mediasoupTypes.WebRtcTransport>;
    readonly codecCompatibility: mediasoupTypes.RtpCapabilities;

    constructor() {
        this.settings = loadSettings();
        this.routers = new Map();
        this.transports = new Map();
        this.codecCompatibility = mediasoup.getSupportedRtpCapabilities();
        mediasoup.createWorker<{}>({
            logLevel: "warn",
        }).then((worker: mediasoupTypes.Worker) => {
            this.worker = worker;
            return worker;
        }).then(async (worker: mediasoupTypes.Worker) => {
            let listenInfos: mediasoupTypes.TransportListenInfo[] = [];

            if (this.settings.MediaEnableTCP) {
                listenInfos.push({
                    protocol: "tcp",
                    ip: this.settings.MediaServerHost,
                    port: this.settings.MediaServerPort,
                    announcedAddress: this.settings.PublicIPAddress,
                });
            }

            if (this.settings.MediaEnableUDP) {
                listenInfos.push({
                    protocol: "udp",
                    ip: this.settings.MediaServerHost,
                    port: this.settings.MediaServerPort,
                    announcedAddress: this.settings.PublicIPAddress,
                });
            }

            this.server = await worker.createWebRtcServer({
                listenInfos,
            });
        }).then(() => console.log("MediaServer ready"));
    }

    isReady(): boolean {
        return this.worker !== undefined && this.server !== undefined;
    }

    async getOrCreateRouter(key: string): Promise<mediasoupTypes.Router> {
        let router = this.routers.get(key)
        if (router === undefined) {
            const codec = this.codecCompatibility.codecs?.find((value) => {
                return value.mimeType === "audio/opus";
            });
            assert(codec !== undefined);
            router = await this.worker!.createRouter({
                mediaCodecs: [
                    codec,
                ],
            });
        }
        return router;
    }

    async createTransport(routerKey: string): Promise<mediasoupTypes.WebRtcTransport> {
        const router = await this.getOrCreateRouter(routerKey);
        return await router.createWebRtcTransport({
            webRtcServer: this.server!,
            preferUdp: true,
        });
    }
}
