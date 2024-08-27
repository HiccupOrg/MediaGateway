import { types as mediasoupTypes } from "mediasoup";
import * as mediasoup from "mediasoup";
import * as dotenv from 'dotenv';
import * as socketio from "socket.io";
import express from 'express';
import * as apollo from '@apollo/client/core/core.cjs';
import * as process from "node:process";
import assert from "node:assert";
import * as http from "node:http";
import * as validator from 'express-validator';
import {SignatureHelper} from "./signature.js";
import {RegisterServiceMutation, RegisterServiceMutationVariables} from "./registry.generated.js";

const gql = apollo.gql;


interface Settings {
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
}


interface SignalSessionState {
    isAuthenticated: boolean;
}


function getSettings(): Settings {
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
    };
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
    registryClient: apollo.ApolloClient<any>;
    publicKey?: string;
    _registerWorkerHandle?: NodeJS.Timeout;

    constructor() {
        this.mediaServer = new MediaServer();
        this.expressInstance = express();
        this.expressInstance.use(express.json());
        this.httpServer = http.createServer(this.expressInstance);
        this.wsServer = new socketio.Server(this.httpServer, {
            cors: {
                origin: "*",
            },
        });
        this.registryClient = new apollo.ApolloClient({
            uri: this.mediaServer.settings.RegistryURL,
            cache: new apollo.InMemoryCache(),
            headers: {
                'X-Hiccup-ServiceToken': this.mediaServer.settings.ServiceToken,
            },
        });
        this.initialize().then(()=>{ console.log("Startup finished"); });
    }

    private async registerServiceWorker() {
        try {
            // Fetch public key from registry server
            const REGISTER_SERVICE = gql`
                mutation RegisterService($category: String!, $serviceId: String!, $info: ServiceInfoInputType!) {
                    registerService(category: $category, serviceId: $serviceId, serviceInfo: $info) {
                        publicKey
                    }
                }
            `;
            const serviceRegistryQueryResult = await this.registryClient.mutate<RegisterServiceMutation, RegisterServiceMutationVariables>({
                mutation: REGISTER_SERVICE,
                variables: {
                    category: "media",
                    serviceId: this.mediaServer.settings.ServiceId,
                    info: {
                        ip: this.mediaServer.settings.PublicIPAddress,
                        hostname: this.mediaServer.settings.PublicDomain || this.mediaServer.settings.PublicIPAddress,
                        port: this.mediaServer.settings.SignalServerPort,
                        loadFactor: 0.1,
                        tags: ["china"],
                    }
                },
            });
            this.publicKey = serviceRegistryQueryResult.data?.registerService?.publicKey;
            assert(this.publicKey);
            SignatureHelper.publicKey = this.publicKey;
        } catch (err) {
            console.warn(`Failed to register service: ${err}`);
        }
        return this.registerServiceWorker.bind(this);
    }

    private async initialize() {
        this._registerWorkerHandle = setInterval(await this.registerServiceWorker(), 30000);

        this.expressInstance.get('/', (req, res) => {
            res.status(418).send("");
        });

        // TODO
        this.expressInstance.post('/createOrUpdateRoomInfo', [
            validator.body("roomId").isString().isLength({min: 8}),
            validator.body("voiceMaxIncomingRate").isNumeric(),
            validator.body("voiceMaxOutgoingRate").isNumeric(),
        ], (req: express.Request, res: express.Response) => {});

        const errorHandler = (handler: Function) => {
            const handleError = (err: Error) => {
                console.error("please handle me", err);
            };

            return async (...args: any) => {
                try {
                    const ret = await handler.apply(this, args);
                    if (ret && typeof ret.catch === "function") {
                        // async handler
                        ret.catch(handleError);
                    }
                } catch (e: any) {
                    // sync handler
                    handleError(e);
                }
            };
        };

        this.wsServer.on('connection', (socket) => {
            socket.on('authorize', errorHandler(async ({ token }: { token: string }) => {
                console.log(await SignatureHelper.verifyJWT(token));
            }));

            socket.on('request_to_join', errorHandler(async (msg: string) => {
            }));

            socket.emit('required_authorize');
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

    setInterval(() => {
        SignatureHelper.cleanUp();
    }, 60000);

    const server = new SignalServer();
}

main()
