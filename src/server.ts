import Redis from "ioredis";
import { WebSocket, WebSocketServer } from "ws";
import * as dotenv from 'dotenv'

// Load environment variables from `.env.local`
dotenv.config({ path: ".env.local" });

const PORT = process.env.PORT || 8080;

// Redis setup
const redisPub = new Redis(process.env.KV_URL ?? '');
const redisSub = new Redis(process.env.KV_URL ?? '');

// WebSocket server
const wss = new WebSocketServer({ port: Number(PORT) });

wss.on("connection", (ws) => {
    console.log("Client connected!");

    // Handle incoming messages from clients
    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        // Publish the message to Redis
        redisPub.publish("annotations", message.toString());
    });

    ws.on("close", () => {
        console.log("Client disconnected!");
    });
});

// Subscribe to Redis
redisSub.subscribe("annotations");
redisSub.on("message", (channel, message) => {
    console.log(`Received from Redis: ${message}`);
    // Broadcast the message to all WebSocket clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
