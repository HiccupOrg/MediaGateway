import {DisconnectReason, Socket} from "socket.io";
import {SignatureHelper} from "./signature.js";
import {LRUCache} from "lru-cache";
import {EventEmitter} from "node:events";
import {WebRtcTransport} from "mediasoup/node/lib/WebRtcTransport.js";
import {Producer} from "mediasoup/node/lib/Producer.js";
import {MediaServer} from "./media_server.js";
import {MediaKind, RtpParameters} from "mediasoup/node/lib/RtpParameters.js";


export const errorHandler = (handler: Function) => {
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


interface MediaTokenPayload {
    service_id: string;
    room_id: string;
    display_name: string;
    max_incoming_bitrate: number;
}


interface ProducerInfo {
    kind: MediaKind;
    rtpParameters: RtpParameters;
}


class MediaSessionState {
    readonly sessionId: string;
    isAuthenticated: boolean;
    businessPayload: MediaTokenPayload | undefined;
    transport: WebRtcTransport | undefined;
    audioProducer: Producer | undefined;
    videoProducer: Producer | undefined;
    observer: EventEmitter;

    constructor(sid: string) {
        this.sessionId = sid;
        this.isAuthenticated = false;
        this.observer = new EventEmitter();
    }

    setAuthenticated(payload: MediaTokenPayload): void {
        this.businessPayload = payload;
        this.isAuthenticated = true;
        this.observer.emit('authenticated', payload);
    }

    setTransport(transport: WebRtcTransport): void {
        this.transport = transport;
        this.transport.on('@close', () => this.onCurrentTransportClosed());
        this.observer.emit('transportOpened', transport);
    }

    get isTransportValid(): boolean {
        return this.transport instanceof WebRtcTransport && !this.transport.closed;
    }

    updateAudioProducer(producer: Producer): void {
        if (this.audioProducer) {
            if (!this.audioProducer.closed) {
                this.audioProducer.close();
            }
        }

        this.audioProducer = producer;
        this.observer.emit('audioProducerUpdated', producer);
    }

    updateVideoProducer(producer: Producer): void {
        if (this.videoProducer) {
            if (!this.videoProducer.closed) {
                this.videoProducer.close();
            }
        }

        this.videoProducer = producer;
        this.observer.emit('videoProducerUpdated', producer);
    }

    destroy() {
        this.observer.emit('beforeDestroy');
        this.audioProducer?.close();
        this.audioProducer = undefined;
        this.videoProducer?.close();
        this.videoProducer = undefined;
        this.transport?.close();
        this.observer.emit('destroy');
        this.observer.removeAllListeners();
    }

    private onCurrentTransportClosed() {
        this.observer.emit('transportClosed');
    }
}


class StateManager {
    disconnectStates: LRUCache<string, MediaSessionState>;

    constructor() {
        this.disconnectStates = new LRUCache({
            max: 2048,
            dispose: (value) => {
                value.destroy();
            },
            ttl: 5 * 60 * 1000,
            allowStale: true,
        });
    }

    private getState(socket: Socket) {
        let state: MediaSessionState | undefined = undefined;
        if (socket.recovered) {
            state = this.disconnectStates.get(socket.id);
        }
        if (!state) {
            state = new MediaSessionState(socket.id);
        }
        return state;
    }

    useSignalHandler(socket: Socket, mediaServer: MediaServer) {
        const state = this.getState(socket);

        const critical_failure = (reason: string) => {
            socket.emit('critical_failure', { reason });
            socket.disconnect();
        };

        const error = (operation: string, reason: string) => {
            socket.emit('operation_error', {
                operation,
                reason,
            });
        };

        const success = (operation: string) => {
            socket.emit('operation_success', {
                operation,
            });
        }

        socket.on('authorize', errorHandler(async ({ token }: { token: string }) => {
            const tokenPayload = await SignatureHelper.verifyJWT(token);
            if (!tokenPayload) {
                critical_failure('authorize_failed');
                return;
            }
            state.setAuthenticated(tokenPayload as MediaTokenPayload);
            success('authorize');
        }));

        socket.on('request_connection_info', errorHandler(async () => {
            if (!state.isAuthenticated) {
                critical_failure('unauthorized');
                return;
            }
            const transport = await mediaServer.createTransport(state.businessPayload!.room_id);
            state.setTransport(transport);
            socket.emit('connection_info', {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            });
        }));

        socket.on('place_audio_producer', errorHandler(async (producerInfo: ProducerInfo) => {
            if (!state.isAuthenticated) {
                critical_failure('unauthorized');
                return;
            }

            if (!state.isTransportValid) {
                socket.emit('require_renew_transport');
                return;
            }

            if (producerInfo.kind !== 'audio') {
                error('place_audio_producer', "Invalid producer type");
                return;
            }

            const newProducer = await state.transport!.produce({
                kind: producerInfo.kind,
                rtpParameters: producerInfo.rtpParameters,
            });

            state.updateAudioProducer(newProducer);

            success('place_audio_producer');
        }));

        socket.on('place_video_producer', errorHandler(async (producerInfo: ProducerInfo) => {
            socket.emit('feature_not_implemented');
        }));

        socket.on('disconnecting', errorHandler((reason: DisconnectReason) => {
            if (reason != "server namespace disconnect" && reason != "client namespace disconnect" && reason != 'server shutting down') {
                // Save only authenticated session
                if (state.isAuthenticated) {
                    this.disconnectStates.set(socket.id, state);
                }
            }
        }));

        socket.emit('required_authorize');
    }
}

export const StateManagerInstance = new StateManager();

