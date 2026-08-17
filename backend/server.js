require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const { MongoClient } = require("mongodb");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// MongoDB
const mongoClient = new MongoClient(process.env.MONGODB_URL);

let messagesCollection;

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoClient.connect();

    const db = mongoClient.db("chat_app");

    messagesCollection = db.collection("messages");

    console.log("MongoDB connected successfully!");
    console.log("Messages collection ready!");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}

// SSE Streaming Endpoint
app.post("/api/chat/stream", async (req, res) => {
  const { message, conversationId } = req.body;

  if (!message || !conversationId) {
    return res.status(400).json({
      error: "Message and conversationId are required",
    });
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Send message to Gemini
    const response = await ai.models.generateContentStream({
  model: "gemini-3.6-flash",
  contents: message,
});

    let fullResponse = "";

    // Stream Gemini response
    for await (const chunk of response) {
      const text = chunk.text || "";

      if (!text) continue;

      fullResponse += text;

      res.write(
        `data: ${JSON.stringify({
          text,
        })}\n\n`
      );
    }

    // Save message + response to MongoDB
    await messagesCollection.insertOne({
      conversationId,
      message,
      response: fullResponse,
      createdAt: new Date(),
    });

    // Tell frontend streaming is finished
    res.write(
      `data: ${JSON.stringify({
        done: true,
      })}\n\n`
    );

    res.end();
  } catch (error) {
    // Print the COMPLETE error
    console.error("Streaming error:");
    console.error(error);

    // Check if Gemini returned a rate limit error
    const errorMessageText = error?.message || "";

    const isRateLimit =
      error?.status === 429 ||
      error?.code === 429 ||
      errorMessageText.includes("429") ||
      errorMessageText.toLowerCase().includes("rate limit") ||
      errorMessageText.toLowerCase().includes("too many requests");

    const errorMessage = isRateLimit
      ? "Gemini rate limit reached. Please try again later."
      : "Failed to stream response";

    // If SSE headers have NOT been sent yet
    if (!res.headersSent) {
      return res.status(isRateLimit ? 429 : 500).json({
        error: errorMessage,
      });
    }

    // If SSE connection is already open
    res.write(
      `data: ${JSON.stringify({
        error: errorMessage,
      })}\n\n`
    );

    res.end();
  }
});

// Get chat history
app.get("/api/chat/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const history = await messagesCollection
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .toArray();

    res.json({
      history,
    });
  } catch (error) {
    console.error("History error:", error);

    res.status(500).json({
      error: "Failed to load chat history",
    });
  }
});

// Start server
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}

startServer();