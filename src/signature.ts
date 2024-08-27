import * as ed25519 from '@noble/ed25519';
import assert from "node:assert";

export class SignatureHelper {
    static publicKey: string = "";
    static nonces: Map<string, Date> = new Map();
    static timeout: number = 5 * 60 * 1000;

    private static isNonceUsed(nonce: string): boolean {
        const nonceTime = this.nonces.get(nonce);
        if (nonceTime && !this.isExpired(nonceTime)) {
            return true;
        }
        this.nonces.delete(nonce);
        return false;
    }

    static async verifyJWT(token: string): Promise<[boolean, Record<any, any>?]> {
        try {
            let [_header, _payload, _signature] = token.split('.');

            let header = JSON.parse(Buffer.from(_header, "base64url").toString('ascii'));
            if (header?.alg !== 'EdDSA') {
                return [false, undefined];
            }

            let payload = JSON.parse(Buffer.from(_payload, "base64url").toString('ascii'));
            let signature = Buffer.from(_signature, "base64url");

            let message = Buffer.from(`${_header}.${_payload}`);
            let isValid = await ed25519.verifyAsync(signature, message, this.publicKey);

            if (isValid) {
                return [true, payload];
            }
        } catch (_err) {}

        return [false, undefined];
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

    static cleanUp() {
        this.nonces = new Map(
            Array.from(this.nonces.entries())
                .filter(([_, nonceTime]) => !this.isExpired(nonceTime))
        );
    }
}