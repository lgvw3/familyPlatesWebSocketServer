import * as assert from "node:assert/strict";
import { test } from "node:test";
import { namespacedChannel, parseAllowedNamespaces, parseRedisChannel, presenceKey } from "./realtime-routing";

test("validates, trims, and deduplicates configured namespaces", () => {
    assert.deepEqual(parseAllowedNamespaces("main, dev,dev"), ["main", "dev"]);
    assert.throws(() => parseAllowedNamespaces(undefined), /REALTIME_NAMESPACES/);
    assert.throws(() => parseAllowedNamespaces("bad namespace"), /REALTIME_NAMESPACES/);
});

test("builds isolated channel and presence keys", () => {
    assert.equal(namespacedChannel("dev", "comments"), "dev:comments");
    assert.equal(presenceKey("dev", 8), "online:dev:8");
});

test("routes only allowed namespaced channels and maps legacy channels to main", () => {
    const allowed = new Set(["main", "dev"]);
    assert.deepEqual(parseRedisChannel("dev:likes", allowed), { namespace: "dev", channel: "likes" });
    assert.deepEqual(parseRedisChannel("comments", allowed), { namespace: "main", channel: "comments" });
    assert.equal(parseRedisChannel("staging:likes", allowed), null);
    assert.equal(parseRedisChannel("dev:unknown", allowed), null);
});
