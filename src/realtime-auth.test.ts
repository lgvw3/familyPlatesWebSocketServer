import * as assert from "node:assert/strict";
import { test } from "node:test";
import { createRealtimeTicket, verifyRealtimeTicket } from "./realtime-auth";

const secret = "test-secret";
const now = 1_700_000_000_000;

test("accepts a valid ticket", () => {
    const ticket = createRealtimeTicket(7, secret, 60, now);
    assert.deepEqual(verifyRealtimeTicket(ticket, secret, now), { userId: 7, exp: 1_700_000_060 });
});

test("rejects missing, tampered, expired, and invalid identity tickets", () => {
    assert.equal(verifyRealtimeTicket(undefined, secret, now), null);
    const ticket = createRealtimeTicket(7, secret, 60, now);
    assert.equal(verifyRealtimeTicket(`${ticket}x`, secret, now), null);
    assert.equal(verifyRealtimeTicket(createRealtimeTicket(7, secret, 60, now - 61_000), secret, now), null);
    assert.throws(() => createRealtimeTicket(0, secret, 60, now));
});
