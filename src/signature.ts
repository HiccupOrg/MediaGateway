import * as ed25519 from '@noble/ed25519';
import assert from "node:assert";
import {Setting} from "./settings.js";
import {LRUCache} from "lru-cache";

export class SignatureHelper {
    static publicKey: string = "";
    static nonces: LRUCache<string, any> = new LRUCache({
        max: 2048,
        allowStale: false,
    });
    static timeout: number = 5 * 60 * 1000;

    private static isNonceUsed(nonce: string | undefined): boolean {
        // Allow if nonce doesn't exist
        if (nonce === undefined) {
            return false;
        }

        const nonceTime = this.nonces.get(nonce);
        if (nonceTime && !this.isExpired(nonceTime)) {
            return true;
        }
        this.nonces.delete(nonce);
        return false;
    }

    static async verifyJWT(token: string): Promise<Record<any, any> | null> {
        if (token === undefined || token === null) {
            return null;
        }
        try {
            let [_header, _payload, _signature] = token.split('.');

            let header = JSON.parse(Buffer.from(_header, "base64url").toString('ascii'));
            if (header?.alg !== 'EdDSA') {
                return null;
            }

            let payload = JSON.parse(Buffer.from(_payload, "base64url").toString('ascii'));
            let signature = Buffer.from(_signature, "base64url");

            let message = Buffer.from(`${_header}.${_payload}`);
            let isValid = await ed25519.verifyAsync(signature, message, this.publicKey);

            if (isValid) {
                const isServiceIdMatch = payload?.service_id === Setting.ServiceId;
                const isNonceUsed = this.isNonceUsed(payload?.nonce);
                if (isServiceIdMatch && !isNonceUsed) {
                    return payload;
                }
            }
        } catch (_err) {}

        return null;
    }

    static async verifyMessage(messageBody: Map<string, any>, signature: string): Promise<[boolean, string?]> {
        const nonce = messageBody.get('nonce');
        let timestamp = messageBody.get('timestamp');
        assert(nonce && timestamp);
        timestamp *= 1000;

        if (this.isNonceUsed(nonce)) {
            return [false, "Message is already handled"];
        }

        const now = new Date();
        if (Math.abs(now.getTime() - timestamp) > this.timeout) {
            return [false, "Expired token"];
        }

        this.nonces.set(nonce, new Date(timestamp));

        // Sorting and concat
        const sortedKeys = Array.from(messageBody.keys()).sort();
        const stringToVerify = sortedKeys.map(key => `${key}:${messageBody.get(key)}`).join(',');

        const isValid = await ed25519.verifyAsync(signature, Buffer.from(stringToVerify), this.publicKey);
        if (!isValid) {
            return [false, "Invalid signature"];
        }

        return [true];
    }

    private static isExpired(nonceTime: Date): boolean {
        const now = Date.now();
        return (now - nonceTime.getTime()) > this.timeout;
    }
}