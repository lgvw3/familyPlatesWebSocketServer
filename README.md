# Family Plates Web Socket Server

This enables the real time communications for the app. Since nextjs doesn't do long lived connections this is connected to via a webhook in the nextjs app on the client side.

Using an upstash redis instance to do pub/sub.

## Authentication

WebSocket upgrades require a short-lived `ticket` query parameter. The ticket
format is `base64url(JSON({ userId, exp })).signatureHex`, signed with
HMAC-SHA256 using `REALTIME_AUTH_SECRET`. `exp` is a Unix timestamp in seconds;
the user ID must be a positive integer. The Next.js app must issue tickets with
the same secret (normally with a lifetime of about 60 seconds), then connect to
`wss://.../?ticket=...`. Invalid or expired tickets receive HTTP 401 before
websocket acceptance.

Copy `.env.example` to `.env.local` and set `REALTIME_AUTH_SECRET` to a long,
random value shared only with the app server. Do not put this secret in browser
environment variables.
