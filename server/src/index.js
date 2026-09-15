import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import session from "express-session";
import { Server } from "socket.io";

import { testConnection } from "./config/sequelize.js";
import "./models/index.js"; // registers model associations
import passport from "./config/passport.js";
import { registerSocketHandlers } from "./sockets/index.js";
import propertiesRouter from "./routes/properties.js";
import expertsRouter from "./routes/experts.js";
import estimatorRouter from "./routes/estimator.js";
import plansRouter from "./routes/plans.js";
import aiStudioRouter from "./routes/aiStudio.js";
import authRouter from "./routes/auth.js";
import oauthRouter from "./routes/oauth.js";
import uploadsRouter from "./routes/uploads.js";
import newsletterRouter from "./routes/newsletter.js";
import adminRouter from "./routes/admin.js";
import contactRouter from "./routes/contact.js";
import notificationsRouter from "./routes/notifications.js";
import messagesRouter from "./routes/messages.js";
import paymentsRouter from "./routes/payments.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST", "PATCH"] },
});

// Makes Socket.IO reachable from any controller as `req.app.get("io")`,
// instead of threading it through factory-function routers. Set this
// before mounting any routes so it's always available to them.
app.set("io", io);

app.use(helmet());
app.use(cors({ origin: CLIENT_URL }));
app.use(morgan("dev"));
app.use(express.json());

// Session is used ONLY to store transient OAuth handshake state (the
// "state"/PKCE values passport-oauth2 needs between the redirect to
// Google/Facebook/X and the callback). The app's actual login sessions are
// JWTs (see middleware/auth.js), not this cookie - MemoryStore is fine for
// a single dev/demo server; swap in a real store (Redis, etc.) for
// production/multi-instance deployments.
app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "dev_only_insecure_secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 10 * 60 * 1000 }, // 10 minutes - just long enough for the OAuth round trip
  })
);
app.use(passport.initialize());

// Health check (useful for uptime monitors / Google Cloud load balancer checks)
app.get("/api/health", (req, res) => res.json({ success: true, status: "ok" }));

app.use("/api/properties", propertiesRouter);
app.use("/api/experts", expertsRouter);
app.use("/api/estimates", estimatorRouter);
app.use("/api/plans", plansRouter);
app.use("/api/ai-studio", aiStudioRouter);
app.use("/api/auth", authRouter);
app.use("/api/auth", oauthRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/newsletter", newsletterRouter);
app.use("/api/admin", adminRouter);
app.use("/api/contact", contactRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/payments", paymentsRouter);

registerSocketHandlers(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 CivilBridge API running on http://localhost:${PORT}`);
  await testConnection();
});
