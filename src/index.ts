import "dotenv/config";
import express from "express";
import cors from "cors";
import chatRouter from "./routes/chat";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow only the Bogat Architecture website (and localhost for dev)
const allowedOrigins = [
  process.env.ALLOWED_ORIGIN || "https://www.bogatarchitecture.com",
  "https://bogatarchitecture.com",
  "http://localhost:3000",
  "http://localhost:8080",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "50kb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "bogat-chatbot" });
});

// Chat endpoint
app.use("/api/chat", chatRouter);

app.listen(PORT, () => {
  console.log(`Bogat chatbot server running on port ${PORT}`);
});

export default app;
