import * as mediasoup from "mediasoup";
import * as socketio from "socket.io";
import express from 'express';
import * as apollo from '@apollo/client/core/core.cjs';
import assert from "node:assert";
import * as http from "node:http";
import {SignatureHelper} from "./signature.js";
import {RegisterServiceMutation, RegisterServiceMutationVariables} from "./registry.generated.js";
import {Setting} from "./settings.js";
import {StateManagerInstance} from "./singal_handler.js";
import {MediaServer} from "./media_server.js";
import {EventEmitter} from "node:events";

const gql = apollo.gql;


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
            connectionStateRecovery: {
                maxDisconnectionDuration: 5 * 60 * 1000,
            },
            cors: {
                origin: "*",
            },
        });
        this.registryClient = new apollo.ApolloClient({
            uri: this.mediaServer.settings.RegistryURL,
            cache: new apollo.InMemoryCache(),
            headers: {
                'X-Hiccup-ServiceToken': Setting.ServiceToken,
            },
        });
        this.initialize().then(()=>{ console.log("Signal server started..."); });
    }

    private async registerServiceWorker() {
        try {
            // Fetch public key from registry server
            const REGISTER_SERVICE = gql`
                mutation RegisterService($category: String!, $info: ServiceInfoInputType!) {
                    registerService(category: $category, serviceInfo: $info) {
                        publicKey
                    }
                }
            `;
            const serviceRegistryQueryResult = await this.registryClient.mutate<RegisterServiceMutation, RegisterServiceMutationVariables>({
                mutation: REGISTER_SERVICE,
                variables: {
                    category: "media",
                    info: {
                        id: Setting.ServiceId,
                        ip: Setting.PublicIPAddress,
                        hostname: Setting.PublicDomain || Setting.PublicIPAddress,
                        port: Setting.SignalServerPort,
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
        this._registerWorkerHandle = setInterval(await this.registerServiceWorker(), Setting.RegisterServiceInterval * 1000);

        this.expressInstance.get('/', (req, res) => {
            res.status(418).send("");
        });

        this.wsServer.of('/media').on('connection', (socket) => {
            StateManagerInstance.useSignalHandler(socket, this.mediaServer, this.wsServer.of('/media'));
        });

        // Waiting for register service success
        const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay));
        while (!SignatureHelper.publicKey) {
            console.log("Waiting for service registration...");
            await sleep(1);
        }

        this.httpServer.listen(Setting.SignalServerPort, () => {});
    }
}


function main() {
    console.log(`Using mediasoup v${mediasoup.version}`)
    // console.log(mediasoup.getSupportedRtpCapabilities())

    mediasoup.observer.on("newworker", (worker) => {
      console.log("Starting worker [pid:%d]", worker.pid);
    });

    // Enable promise rejection capture
    EventEmitter.captureRejections = true;

    const server = new SignalServer();
}

main()
