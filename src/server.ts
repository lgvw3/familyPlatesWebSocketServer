import Redis from "ioredis";
import { WebSocket, WebSocketServer } from "ws";
import * as dotenv from 'dotenv'
import * as http from "http";
import { createClient } from 'redis';
import * as crypto from 'crypto'
import * as cookie from 'cookie'


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

const redis = createClient({
    url: process.env.KV_URL
});

async function initializeRedis() {
    try {
        await redis.connect();
        console.log('Redis connected');
    } catch (error) {
        console.error('Redis connection failed:', error);
    }
}

initializeRedis();

// Redis setup
const redisPub = new Redis(process.env.KV_URL ?? '');
const redisSub = new Redis(process.env.KV_URL ?? '');

// WebSocket server
const wss = new WebSocketServer({ server });

function validateToken(token: string): { userId: number | null } {
    const secret = process.env.SECRET_KEY || 'super-secret-key';
    const [userId, hash] = token.split(':');
  
    const validHash = crypto.createHmac('sha256', secret).update(userId).digest('hex');
    if (hash === validHash) {
        return { userId: parseInt(userId, 10) };
    }
  
    return { userId: null };
}

wss.on("connection", async (ws, request) => {
    console.log("Client connected!");

    const c = cookie.parse(request.headers.cookie ?? '')
    
    const userId = validateToken(c.familyPlatesAuthToken ?? '').userId

    if (!userId) {
        console.log('No user ID found in cookies');
        ws.close();
        return;
    }
    else {
        console.log(userId)
    }

    // Mark user online in Redis with 60-second TTL (will auto-expire if no heartbeat)
    await redis.set(`online:${userId}`, Date.now().toString(), {
        EX: 60 // Expire in 60 seconds
    });

    const heartbeat = setInterval(async () => {
        await redis.set(`online:${userId}`, Date.now().toString(), {
            EX: 60 // Expire in 60 seconds
        });
    }, 30000);

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

    ws.on("close", async () => {
        console.log("Client disconnected!");
        await redis.del(`online:${userId}`);
        clearInterval(heartbeat)
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
