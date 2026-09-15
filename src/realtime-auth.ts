import { createHmac, timingSafeEqual } from "crypto";

export interface RealtimeTicketPayload { userId: number; exp: number; }

function signatureFor(payload: string, secret: string): string {
    return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Create a short-lived ticket for a positive numeric family profile ID. */
export function createRealtimeTicket(userId: number, secret: string, ttlSeconds = 60, nowMs = Date.now()): string {
    if (!Number.isSafeInteger(userId) || userId <= 0) throw new Error("userId must be a positive integer");
    if (!secret) throw new Error("REALTIME_AUTH_SECRET is required");
    const payload = Buffer.from(JSON.stringify({ userId, exp: Math.floor(nowMs / 1000) + ttlSeconds }), "utf8").toString("base64url");
    return `${payload}.${signatureFor(payload, secret)}`;
}

/** Verify attacker-controlled input without throwing. Timestamps are Unix seconds. */
export function verifyRealtimeTicket(ticket: unknown, secret: string | undefined, nowMs = Date.now()): RealtimeTicketPayload | null {
    if (typeof ticket !== "string" || !secret) return null;
    const separator = ticket.lastIndexOf(".");
    if (separator <= 0) return null;
    const payloadPart = ticket.slice(0, separator);
    const supplied = ticket.slice(separator + 1);
    if (!/^[0-9a-f]{64}$/i.test(supplied)) return null;
    const expectedBytes = Buffer.from(signatureFor(payloadPart, secret), "hex");
    const suppliedBytes = Buffer.from(supplied, "hex");
    if (suppliedBytes.length !== expectedBytes.length || !timingSafeEqual(suppliedBytes, expectedBytes)) return null;
    try {
        const decoded = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as Partial<RealtimeTicketPayload>;
        const { userId, exp } = decoded;
        if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0 ||
            typeof exp !== "number" || !Number.isSafeInteger(exp) || exp <= Math.floor(nowMs / 1000)) return null;
        return { userId, exp };
    } catch { return null; }
}
