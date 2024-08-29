import {DisconnectReason, Namespace, Socket} from "socket.io";
import {SignatureHelper} from "./signature.js";
import {LRUCache} from "lru-cache";
import {EventEmitter} from "node:events";
import {
    DtlsParameters,
    IceCandidate,
    IceParameters,
    IceState,
    WebRtcTransport
} from "mediasoup/node/lib/WebRtcTransport.js";
import {Producer} from "mediasoup/node/lib/Producer.js";
import {MediaServer} from "./media_server.js";
import {MediaKind, RtpCapabilities, RtpParameters} from "mediasoup/node/lib/RtpParameters.js";
import {UUID} from "node:crypto";


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
    server_id: string;
    display_name: string;
    max_incoming_bitrate: number;
}


interface ProducerInfo {
    kind: MediaKind;
    rtpParameters: RtpParameters;
}


interface ProducerUpdateEvent {
    newProducer: Producer;
    oldProducer: Producer;
}


class MediaSessionState {
    readonly sessionId: string;
    isAuthenticated: boolean;
    businessPayload: MediaTokenPayload | undefined;
    transport: WebRtcTransport | undefined;
    audioProducer: Producer | undefined;
    videoProducer: Producer | undefined;
    observer: EventEmitter;
    displayName: string;
    readonly userId: UUID;
    readonly server: Namespace;

    constructor(sid: string, server: Namespace) {
        this.sessionId = sid;
        this.isAuthenticated = false;
        this.observer = new EventEmitter();
        this.displayName = "AnonymousUser";
        this.userId = crypto.randomUUID();
        this.server = server;
        this.initializeObserver();
    }

    setAuthenticated(payload: MediaTokenPayload): void {
        this.businessPayload = payload;
        this.displayName = this.businessPayload.display_name;
        this.isAuthenticated = true;
        this.observer.emit('authenticated', payload);
    }

    setTransport(transport: WebRtcTransport): void {
        this.transport = transport;
        this.transport.on('@close', () => this.onCurrentTransportClosed());
        this.transport.on('icestatechange', (state) => this.onCurrentTransportIceStateChanged(state));
        this.observer.emit('transportOpened', transport);
    }

    get isTransportValid(): boolean {
        return this.transport instanceof WebRtcTransport && !this.transport.closed;
    }

    updateAudioProducer(producer: Producer | undefined): Producer | undefined {
        if (this.audioProducer) {
            if (!this.audioProducer.closed) {
                this.audioProducer.close();
            }
        }

        const oldProducer = this.audioProducer;
        this.audioProducer = producer;
        this.observer.emit('audioProducerUpdated', {
            newProducer: producer,
            oldProducer,
        });
        return oldProducer;
    }

    updateVideoProducer(producer: Producer): Producer | undefined {
        if (this.videoProducer) {
            if (!this.videoProducer.closed) {
                this.videoProducer.close();
            }
        }

        const oldProducer = this.videoProducer;
        this.videoProducer = producer;
        this.observer.emit('videoProducerUpdated', {
            newProducer: producer,
            oldProducer,
        });
        return oldProducer;
    }

    updateDisplayName(name: string): void {
        this.displayName = name;
        this.observer.emit('displayNameChanged', name);
    }

    destroy() {
        this.observer.emit('beforeDestroy');
        // this.audioProducer?.close();
        this.audioProducer = undefined;
        // this.videoProducer?.close();
        this.videoProducer = undefined;
        this.transport?.close();
        this.observer.emit('destroy');
        this.observer.removeAllListeners();
    }

    private onCurrentTransportClosed() {
        this.observer.emit('transportClosed');
    }

    private onCurrentTransportIceStateChanged(state: IceState) {
        if (state === 'completed') {
            this.observer.emit('transportUserCompleted');
        } else if (state === 'disconnected') {
            this.observer.emit('transportUserDisconnected');
        } else if (state === 'closed') {
            this.observer.emit('transportUserClosed');
        }
    }

    private initializeObserver(): void {
        const userJoinTransportHandler = () => {
            this.server.to(this.businessPayload!.server_id).emit('userJoin', {
                userId: this.userId,
                channel: this.businessPayload!.room_id,
                displayName: this.displayName,
            });
        };
        this.observer.on('transportUserCompleted', userJoinTransportHandler);

        const userLeaveTransportHandler = () => {
            this.server.to(this.businessPayload!.server_id).emit('userLeave', {
                userId: this.userId,
                channel: this.businessPayload!.room_id,
            });
        };
        this.observer.on('transportUserClosed', userLeaveTransportHandler);

        const userNameChangedHandler = () => {
            this.server.to(this.businessPayload!.server_id).emit('userNameChanged', {
                userId: this.userId,
                displayName: this.displayName,
            });
        };
        this.observer.on('displayNameChanged', userNameChangedHandler);
    }
}

interface MediaServerToClientEvents {
    required_authorize: () => void;
    critical_failure: (reason: { reason: string; }) => void;
    operation_error: (reason: { reason: string; operation: string; }) => void;
    user_audio_producer_updated: (data: {
        userId: string;
        oldProducerId?: string;
        newProducerId: string;
    }) => void;
}

interface MediaClientToServerEvents {
    authorize: (token: { token: string }, callback: () => void) => void;
    request_connection_info: (callback: (
        data: {
            id: string;
            routerRtpCapabilities: RtpCapabilities,
            iceParameters: IceParameters,
            iceCandidates: IceCandidate[],
            dtlsParameters: DtlsParameters,
        }
    ) => void) => void;
    request_connect: (data: {
        dtlsParameters: DtlsParameters,
    }, callback: (ok: boolean) => void) => void;
    place_audio_producer: (producerInfo: ProducerInfo, callback: (
        data?: {
            producerId: string;
        },
        error?: {
            requireRenewTransport?: boolean;
        },
    ) => void) => void;
    place_video_producer: (producerInfo: ProducerInfo, callback: (
        data?: {
            producerId: string;
        },
        error?: {
            requireRenewTransport?: boolean;
        },
    ) => void) => void;
    request_change_name: (newName: string) => void;
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

    private getState(socket: Socket, server: Namespace) {
        let state: MediaSessionState | undefined = undefined;
        if (socket.recovered) {
            state = this.disconnectStates.get(socket.id);
        }
        if (!state) {
            state = new MediaSessionState(socket.id, server);
        }
        return state;
    }

    useSignalHandler(socket: Socket<MediaClientToServerEvents, MediaServerToClientEvents>, mediaServer: MediaServer, socketServer: Namespace<MediaClientToServerEvents, MediaServerToClientEvents>) {
        const state = this.getState(socket, socketServer);

        const critical_failure = (reason: string) => {
            socket.emit('critical_failure', { reason });
            socket.disconnect();
        };

        (socket as any)[Symbol.for('nodejs.rejection')] = (err: any) => {
            console.error(err);
            critical_failure("Uncaught exception");
        };

        const error = (operation: string, reason: string) => {
            socket.emit('operation_error', {
                operation,
                reason,
            });
        };

        socket.on('authorize', async ({ token }: { token: string }, callback) => {
            const tokenPayload: MediaTokenPayload = await SignatureHelper.verifyJWT(token) as MediaTokenPayload;
            if (!tokenPayload) {
                critical_failure('authorize_failed');
                return;
            }
            state.setAuthenticated(tokenPayload);
            socket.join(tokenPayload.server_id);
            socket.join(tokenPayload.room_id);
            callback();
        });

        socket.on('request_connection_info', async (callback) => {
            if (!state.isAuthenticated) {
                critical_failure('unauthorized');
                return;
            }
            const transport = await mediaServer.createTransport(state.businessPayload!.room_id);
            state.setTransport(transport);
            callback({
                id: transport.id,
                routerRtpCapabilities: mediaServer.codecCompatibility,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            });
        });

        socket.on('request_connect', async ({ dtlsParameters }, callback) => {
            callback(await state.transport?.connect({dtlsParameters}) !== undefined);
        });

        socket.on('place_audio_producer', async (producerInfo, callback) => {
            if (!state.isAuthenticated) {
                critical_failure('unauthorized');
                return;
            }

            if (!state.isTransportValid) {
                callback(undefined, {
                    requireRenewTransport: true,
                });
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

            const oldProducerId = state.updateAudioProducer(newProducer)?.id;
            const newProducerId = newProducer.id;
            socket.to(state.businessPayload!.room_id).emit('user_audio_producer_updated', {
                userId: state.userId,
                oldProducerId,
                newProducerId,
            });

            callback({
                producerId: newProducerId,
            }, undefined);
        });

        socket.on('place_video_producer', async (producerInfo: ProducerInfo) => {
            if (!state.isAuthenticated) {
                critical_failure('unauthorized');
                return;
            }
            critical_failure('Feature not implemented');
        });

        socket.on('request_change_name', async (newName) => {
            if (!state.isAuthenticated) {
                critical_failure('unauthorized');
                return;
            }
            state.updateDisplayName(newName);
        });

        socket.on('disconnecting', (reason: DisconnectReason) => {
            if (reason != "server namespace disconnect" && reason != "client namespace disconnect" && reason != 'server shutting down') {
                // Save only authenticated session
                if (state.isAuthenticated) {
                    this.disconnectStates.set(socket.id, state);
                }
            }
        });

        socket.emit('required_authorize');
    }
}

export const StateManagerInstance = new StateManager();

