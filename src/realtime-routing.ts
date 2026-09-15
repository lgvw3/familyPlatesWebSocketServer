export const BASE_CHANNELS = ["annotations", "annotationUpdates", "bookmarks", "comments", "likes", "commentLikes"] as const;

export function parseAllowedNamespaces(value: string | undefined) {
    const namespaces = value?.split(",").map(item => item.trim()).filter(Boolean) ?? [];
    if (!namespaces.length || namespaces.some(item => !/^[A-Za-z0-9_-]{1,32}$/.test(item))) {
        throw new Error("REALTIME_NAMESPACES is required and must be a comma-separated list of valid namespaces");
    }
    return [...new Set(namespaces)];
}

export function namespacedChannel(namespace: string, channel: string) {
    return `${namespace}:${channel}`;
}

export function presenceKey(namespace: string, userId: number) {
    return `online:${namespace}:${userId}`;
}

export function parseRedisChannel(
    receivedChannel: string,
    allowedNamespaces: ReadonlySet<string>,
): { namespace: string; channel: string } | null {
    if ((BASE_CHANNELS as readonly string[]).includes(receivedChannel)) {
        return allowedNamespaces.has("main") ? { namespace: "main", channel: receivedChannel } : null;
    }
    const separator = receivedChannel.indexOf(":");
    if (separator < 1) return null;
    const namespace = receivedChannel.slice(0, separator);
    const channel = receivedChannel.slice(separator + 1);
    if (!allowedNamespaces.has(namespace) || !(BASE_CHANNELS as readonly string[]).includes(channel)) return null;
    return { namespace, channel };
}
