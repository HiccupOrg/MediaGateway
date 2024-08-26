import * as ed25519 from '@noble/ed25519';
import assert from "node:assert";

export class SignatureHelper {
    static publicKey: string = "";
    static nonces: Map<string, Date> = new Map();
    static timeout: number = 60000;

    private static isNonceUsed(nonce: string): boolean {
        const nonceTime = this.nonces.get(nonce);
        if (nonceTime) {
            const now = new Date();
            if (now.getTime() - nonceTime.getTime() < this.timeout * 2) {
                return true;
            } else {
                this.nonces.delete(nonce);
            }
        }
        return false;
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

        const isValid = await ed25519.verifyAsync(signature, stringToVerify, this.publicKey);
        if (!isValid) {
            return [false, "Invalid signature"];
        }

        return [true];
    }
}