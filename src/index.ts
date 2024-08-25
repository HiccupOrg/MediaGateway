import { types as mediasoupTypes } from "mediasoup";
import * as mediasoup from "mediasoup";
import * as dotenv from 'dotenv';
import * as ed25519 from '@noble/ed25519'
import * as socketio from "socket.io";
import express from 'express';
import * as process from "node:process";
import assert from "node:assert";
import * as http from "node:http";


interface Settings {
    MediaServerHost: string;
    MediaServerPort: number;
    MediaEnableTCP: boolean;
    MediaEnableUDP: boolean;
    MediaPublicIPAddress?: string;
    SignalServerHost: string;
    SignalServerPort: number;
}


interface SignalSessionState {
    sessionId: string;
    routerId?: string;
}


interface SignalPayload {
    type: "dummy" | "authenticate" | "join_info"
    data: any
}


interface AuthToken {
    routerId: string
    signature: string
}


function getSettings(): Settings {
    dotenv.config({
        encoding: "utf-8",
        override: true,
        debug: process.env.DEBUG?.toLowerCase() == "true",
    });

    return {
        MediaServerHost: process.env.MEDIA_SERVER_HOST || "127.0.0.1",
        MediaServerPort: parseInt(process.env.MEDIA_SERVER_PORT || "1441"),
        MediaEnableTCP: process.env.MEDIA_ENABLE_TCP?.toLowerCase() == "true",
        MediaEnableUDP: process.env.MEDIA_ENABLE_UDP?.toLowerCase() == "true",
        MediaPublicIPAddress: process.env.MEDIA_PUBLIC_IP_ADDRESS,
        SignalServerHost: process.env.SIGNAL_SERVER_HOST || "127.0.0.1",
        SignalServerPort: parseInt(process.env.SIGNAL_SERVER_PORT || "1441"),
    };
}


async function checkAuthToken(token: AuthToken, publicKey: string): Promise<boolean> {
    return await ed25519.verifyAsync(token.signature, Buffer.from(token.routerId), publicKey);
}

function generateCustomRandomString(length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$*%&^()') {
    let result = '';
    const charactersLength = chars.length;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

class MediaServer {
    settings: Settings;
    worker?: mediasoupTypes.Worker;
    routers: Map<string, mediasoupTypes.Router>;
    server?: mediasoupTypes.WebRtcServer;
    transports: Map<string, mediasoupTypes.WebRtcTransport>;
    readonly codecCompatibility: mediasoupTypes.RtpCapabilities;

    constructor() {
        this.settings = getSettings();
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
                    announcedAddress: this.settings.MediaPublicIPAddress,
                });
            }

            if (this.settings.MediaEnableUDP) {
                listenInfos.push({
                    protocol: "udp",
                    ip: this.settings.MediaServerHost,
                    port: this.settings.MediaServerPort,
                    announcedAddress: this.settings.MediaPublicIPAddress,
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

    async getSessionTransport(sessionId: string, routerKey: string): Promise<mediasoupTypes.WebRtcTransport> {
        let transport = this.transports.get(sessionId);
        if (transport === undefined) {
            const router = await this.getOrCreateRouter(routerKey);
            transport = await router.createWebRtcTransport({
                webRtcServer: this.server!,
                preferUdp: true,
            });
        }

        return transport;
    }

    cleanSession(sessionId: string) {
        const transport = this.transports.get(sessionId);
        if (transport !== undefined) {
            transport.close();
        }
        this.transports.delete(sessionId);
    }

}


class SignalServer {
    mediaServer: MediaServer;
    expressInstance: express.Express;
    httpServer: http.Server;
    wsServer: socketio.Server;

    constructor() {
        this.mediaServer = new MediaServer();
        this.expressInstance = express();
        this.httpServer = http.createServer(this.expressInstance);
        this.wsServer = new socketio.Server(this.httpServer);
        this.initialize();
    }

    private initialize() {
        this.expressInstance.get('/', (req, res) => {
            res.status(418).send("");
        });

        this.wsServer.on('connection', (ws) => {
        });

        this.httpServer.listen(this.mediaServer.settings.SignalServerPort, () => {});
    }
}


function main() {
    console.log(`Using mediasoup v${mediasoup.version}`)
    // console.log(mediasoup.getSupportedRtpCapabilities())

    mediasoup.observer.on("newworker", (worker) => {
      console.log("Starting worker [pid:%d]", worker.pid);
    });

    const server = new SignalServer();
}

main()
