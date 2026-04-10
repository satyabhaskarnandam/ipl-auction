const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");
const { registerAuctionSocketHandlers } = require("./sockets/auctionSocket");
const { loadAuctionSets } = require("./controllers/playerDatasetController");
const { getAllPublicRooms, getPublicRoomsCount, setRedisClient } = require("./controllers/roomController");
const { postTeamRatings } = require("./controllers/teamRatingController");

const app = express();
const server = http.createServer(app);

// Initialize Redis clients for general state and Socket.io adapter
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const pubClient = new Redis(redisUrl, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
});
const subClient = pubClient.duplicate();
const redisClient = new Redis(redisUrl, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Error handling to prevent process crashes
const handleRedisError = (clientName) => (err) => {
  console.error(`[REDIS] ${clientName} Error:`, err.message);
};

pubClient.on("error", handleRedisError("PubClient"));
subClient.on("error", handleRedisError("SubClient"));
redisClient.on("error", handleRedisError("StateClient"));

pubClient.on("connect", () => console.log("[REDIS] PubClient connected"));
subClient.on("connect", () => console.log("[REDIS] SubClient connected"));
redisClient.on("connect", () => console.log("[REDIS] StateClient connected"));

// Share redis client with room controller for distributed state
setRedisClient(redisClient);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  adapter: createAdapter(pubClient, subClient),
  transports: ["websocket"],
  pingTimeout: 25000,
  pingInterval: 15000,
  perMessageDeflate: false,
  connectTimeout: 10000,
});

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    message: "IPL auction server is running",
  });
});

app.get("/players/sets", (req, res) => {
  try {
    const auctionType = req.query.auctionType === 'mini' ? 'mini' : 'mega';
    const payload = loadAuctionSets({ relaxed: true, auctionType });
    res.status(200).json(payload);
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
});

app.get("/rooms/public", async (req, res) => {
  try {
    const publicRooms = await getAllPublicRooms();
    res.status(200).json({
      ok: true,
      rooms: publicRooms,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      message: error.message,
    });
  }
});

app.get("/rooms/public/count", async (req, res) => {
  try {
    const count = await getPublicRoomsCount();
    res.status(200).json({ ok: true, count });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message });
  }
});

// Feedback key in Redis
const FEEDBACK_LIST_KEY = "ipl_auction_feedbacks";

app.post("/feedback", async (req, res) => {
  try {
    const { rating, comment, roomId, username, team } = req.body;
    
    // Get unique ID by incrementing a counter in Redis
    const nextId = await redisClient.incr("ipl_auction_feedback_counter");
    
    const newFeedback = {
      id: nextId,
      rating: Number(rating),
      comment: comment || "",
      roomId,
      username: username || "Anonymous",
      team: team || "Spectator",
      createdAt: Date.now()
    };
    
    // Push into Redis list
    await redisClient.lpush(FEEDBACK_LIST_KEY, JSON.stringify(newFeedback));
    // Trim list if it gets too large (e.g., keep last 5000)
    await redisClient.ltrim(FEEDBACK_LIST_KEY, 0, 4999);

    console.log(`[FEEDBACK SAVED] Room: ${roomId} | User: ${username} | Rating: ${rating}/5`);
    res.status(200).json({ ok: true, message: "Feedback received" });
  } catch (error) {
    console.error("Feedback error:", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

app.get("/feedback", async (req, res) => {
  try {
    const rawFeedbacks = await redisClient.lrange(FEEDBACK_LIST_KEY, 0, 500); // Get latest 500
    const feedbacks = rawFeedbacks.map(f => JSON.parse(f));
    res.status(200).json({ ok: true, feedbacks });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

app.post("/teams/ratings", postTeamRatings);

registerAuctionSocketHandlers(io);

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});