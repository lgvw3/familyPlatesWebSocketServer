import * as assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { createRealtimeTicket, verifyRealtimeTicket } from "./realtime-auth";

const secret = "test-secret";
const now = 1_700_000_000_000;
const allowedNamespaces = new Set(["main", "dev"]);

test("accepts a valid ticket", () => {
    const ticket = createRealtimeTicket(7, secret, "dev", 60, now);
    assert.deepEqual(verifyRealtimeTicket(ticket, secret, allowedNamespaces, now), { userId: 7, namespace: "dev", exp: 1_700_000_060 });
});

test("rejects missing, tampered, expired, and invalid identity tickets", () => {
    assert.equal(verifyRealtimeTicket(undefined, secret, allowedNamespaces, now), null);
    const ticket = createRealtimeTicket(7, secret, "dev", 60, now);
    assert.equal(verifyRealtimeTicket(`${ticket}x`, secret, allowedNamespaces, now), null);
    assert.equal(verifyRealtimeTicket(createRealtimeTicket(7, secret, "dev", 60, now - 61_000), secret, allowedNamespaces, now), null);
    assert.equal(verifyRealtimeTicket(createRealtimeTicket(7, secret, "staging", 60, now), secret, allowedNamespaces, now), null);
    assert.throws(() => createRealtimeTicket(0, secret, "dev", 60, now));
});

test("temporarily treats a legacy ticket without a namespace as main", () => {
    const payload = Buffer.from(JSON.stringify({ userId: 7, exp: 1_700_000_060 }), "utf8").toString("base64url");
    const ticket = `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
    assert.deepEqual(verifyRealtimeTicket(ticket, secret, allowedNamespaces, now), { userId: 7, namespace: "main", exp: 1_700_000_060 });
});
