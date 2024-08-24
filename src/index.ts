import { types as mediasoupTypes } from "mediasoup";
import * as ws from 'ws';
import * as mediasoup from "mediasoup";
import * as dotenv from 'dotenv';
import * as process from "node:process";
import * as ed25519 from '@noble/ed25519'
import {isStringObject} from "node:util/types";
import assert from "node:assert";


interface Settings {
    MediaServerHost: string;
    MediaServerPort: number;
    MediaEnableTCP: boolean;
    MediaEnableUDP: boolean;
    MediaPublicIPAddress?: string;
    SignalServerHost: string;
    SignalServerPort: number;
    PublicKey: string;
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

    console.assert(process.env.PUBLIC_KEY, "Public Key must be set");

    return {
        MediaServerHost: process.env.MEDIA_SERVER_HOST || "127.0.0.1",
        MediaServerPort: parseInt(process.env.MEDIA_SERVER_PORT || "1441"),
        MediaEnableTCP: process.env.MEDIA_ENABLE_TCP?.toLowerCase() == "true",
        MediaEnableUDP: process.env.MEDIA_ENABLE_UDP?.toLowerCase() == "true",
        MediaPublicIPAddress: process.env.MEDIA_PUBLIC_IP_ADDRESS,
        SignalServerHost: process.env.SIGNAL_SERVER_HOST || "127.0.0.1",
        SignalServerPort: parseInt(process.env.SIGNAL_SERVER_PORT || "1441"),
        PublicKey: process.env.PUBLIC_KEY!,
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
    websocketServer: ws.WebSocketServer;

    constructor() {
        this.mediaServer = new MediaServer();
        this.websocketServer = new ws.WebSocketServer({
            host: this.mediaServer.settings.SignalServerHost,
            port: this.mediaServer.settings.SignalServerPort,
        });
        this.initialize();
    }

    private initialize() {
        this.websocketServer.on("connection", (ws) => {
            let sessionState: SignalSessionState = {
                sessionId: generateCustomRandomString(64),
            };

            const endSession = (reason: string) => {
                if (ws.readyState !== ws.CLOSED) {
                    ws.close(1008, JSON.stringify({ reason }));
                }
                this.mediaServer.cleanSession(sessionState.sessionId);
            };

            ws.on('error', (error) => {
                endSession("Internal Server Error");
                console.error(error);
            });

            ws.on('close', () => {
                endSession("closed");
            });

            ws.on('message', async (message) => {
                try {
                    const msg: SignalPayload = JSON.parse(message.toString());

                    if (msg.type === "authenticate") {
                        if (await checkAuthToken(msg.data, this.mediaServer.settings.PublicKey)) {
                            sessionState.routerId = msg.data.routerId;
                            ws.send(JSON.stringify({ type: "authenticated" }));
                            return;
                        }
                    }

                    if (sessionState.routerId === undefined) {
                        endSession("Unauthorized");
                        return;
                    }

                    if (msg.type === "dummy") {
                        ws.send(JSON.stringify(sessionState));
                        return;
                    } else if (msg.type === "join_info") {
                        if (!this.mediaServer.isReady()) {
                            ws.send(JSON.stringify({ type: "not_ready" }));
                            return;
                        }
                        const transport = await this.mediaServer.getSessionTransport(sessionState.sessionId, sessionState.sessionId);
                        ws.send(JSON.stringify({
                            id: transport.id,
                            iceParameters: transport.iceParameters,
                            iceCandidates: transport.iceCandidates,
                            dtlsParameters: transport.dtlsParameters
                        }));
                        return;
                    }

                    endSession("Bad Message");
                } catch (e) {
                    console.error(e);
                    endSession("Uncaught Exception");
                }
            });

            ws.send(JSON.stringify({
                type: "authenticate_required",
            }));
        });
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
