import Redis from "ioredis";
import { WebSocket, WebSocketServer } from "ws";
import * as dotenv from 'dotenv'
import * as http from "http";


// Load environment variables from `.env.local`
dotenv.config({ path: ".env.local" });

const PORT = process.env.PORT || 8080;

// Create an HTTP server
const server = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
    } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`WebSocket server is running on ws://localhost:${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
});

// Redis setup
const redisPub = new Redis(process.env.KV_URL ?? '');
const redisSub = new Redis(process.env.KV_URL ?? '');

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
    console.log("Client connected!");

    // Handle incoming messages from clients not really doing it this way right now
    // publishing straight to redis and using the subs below
    ws.on("message", (message) => {
        const parsedMessage = JSON.parse(message.toString());
        if (parsedMessage.channel == 'annotation') {
            console.log(`Received annotation: ${message}`);
            // Publish the message to Redis
            redisPub.publish("annotations", message.toString());
        }
        else if (parsedMessage.channel == 'bookmark') {
            console.log(`Received bookmark: ${message}`);
            // Publish the message to Redis
            redisPub.publish("bookmarks", message.toString());
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected!");
    });
});

// Subscribe to Redis
redisSub.subscribe("annotations");
redisSub.subscribe("bookmarks");
redisSub.subscribe("comments");
redisSub.subscribe("likes")

redisSub.on("message", (channel, message) => {
    console.log(`Message from Redis on channel '${channel}': ${message}`);
    // Broadcast the message to all WebSocket clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ channel, data: message }));
        }
    });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
