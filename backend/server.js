require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = 5000;

// =====================================================
// Middleware
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// Gemini
// =====================================================

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// =====================================================
// MongoDB
// =====================================================

const mongoClient = new MongoClient(
  process.env.MONGODB_URL
);

let messagesCollection;
let feedbackCollection;

// =====================================================
// Connect MongoDB
// =====================================================

async function connectDB() {
  try {
    await mongoClient.connect();

    const db = mongoClient.db("chat_app");

    messagesCollection =
      db.collection("messages");

    feedbackCollection =
      db.collection("feedback");

    console.log(
      "MongoDB connected successfully!"
    );

    console.log(
      "Messages collection ready!"
    );

    console.log(
      "Feedback collection ready!"
    );
    // =====================================================
// Migrate old messages to versioning system
// =====================================================

const oldMessages =
  await messagesCollection
    .find({
      response: {
        $exists: true,
        $ne: "",
      },

      $or: [
        {
          versions: {
            $exists: false,
          },
        },
        {
          versions: {
            $size: 0,
          },
        },
      ],
    })
    .toArray();

for (const item of oldMessages) {
  await messagesCollection.updateOne(
    {
      _id: item._id,
    },
    {
      $set: {
        activeVersion: 1,

        versions: [
          {
            version: 1,

            text: item.response,

            createdAt:
              item.updatedAt ||
              item.createdAt ||
              new Date(),
          },
        ],

        updatedAt:
          item.updatedAt ||
          new Date(),
      },
    }
  );
}

if (oldMessages.length > 0) {
  console.log(
    `Migrated ${oldMessages.length} old messages to versioning`
  );
}
  } catch (error) {
    console.error(
      "MongoDB connection error:",
      error
    );

    process.exit(1);
  }
}

// =====================================================
// Gemini helper
// =====================================================

async function generateGeminiResponse(
  message
) {
  const response =
    await ai.models.generateContentStream({
      model: "gemini-3.6-flash",
      contents: message,
    });

  return response;
}

// =====================================================
// GET ALL CHAT THREADS
// =====================================================

app.get(
  "/api/chat/threads",
  async (req, res) => {
    try {
      console.log(
        "GET /api/chat/threads"
      );

      const threads =
        await messagesCollection
          .aggregate([
            {
              $sort: {
                createdAt: -1,
              },
            },

            {
              $group: {
                _id: "$conversationId",

                title: {
                  $first: "$message",
                },

                updatedAt: {
                  $first: "$createdAt",
                },
              },
            },

            {
              $sort: {
                updatedAt: -1,
              },
            },

            {
              $project: {
                _id: 0,

                conversationId:
                  "$_id",

                title: 1,

                updatedAt: 1,
              },
            },
          ])
          .toArray();

      console.log(
        "Threads found:",
        threads.length
      );

      res.json({
        threads,
      });
    } catch (error) {
      console.error(
        "Threads error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load chat threads",
      });
    }
  }
);

// =====================================================
// SSE STREAMING CHAT
// =====================================================

app.post(
  "/api/chat/stream",
  async (req, res) => {
    const {
      message,
      conversationId,
    } = req.body;

    console.log(
      "Incoming message:",
      message
    );

    console.log(
      "Conversation ID:",
      conversationId
    );

    // =================================================
    // Validate
    // =================================================

    if (
      !message ||
      !conversationId
    ) {
      return res.status(400).json({
        error:
          "Message and conversationId are required",
      });
    }

    // =================================================
    // SSE headers
    // =================================================

    res.setHeader(
      "Content-Type",
      "text/event-stream"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    try {
      // =================================================
      // Create message document
      // =================================================

      const now = new Date();

      const insertedMessage =
        await messagesCollection.insertOne({
          conversationId,

          message,

          response: "",

          // =============================================
          // Versioning
          // =============================================

          activeVersion: 1,

          versions: [],

          createdAt: now,

          updatedAt: now,
        });

      const messageId =
        insertedMessage.insertedId;

      console.log(
        "Message saved:",
        messageId.toString()
      );

      // =================================================
      // Generate Gemini response
      // =================================================

      const response =
        await generateGeminiResponse(
          message
        );

      let fullResponse = "";

      // =================================================
      // Stream Gemini response
      // =================================================

      for await (const chunk of response) {
        const text =
          chunk.text || "";

        if (!text) {
          continue;
        }

        fullResponse += text;

        // ===============================================
        // Send chunk to frontend
        // ===============================================

        res.write(
          `data: ${JSON.stringify({
            text,
          })}\n\n`
        );
      }

      // =================================================
      // Save first response version
      // =================================================

      await messagesCollection.updateOne(
        {
          _id: messageId,
        },
        {
          $set: {
            response:
              fullResponse,

            activeVersion: 1,

            versions: [
              {
                version: 1,

                text:
                  fullResponse,

                createdAt:
                  new Date(),
              },
            ],

            updatedAt:
              new Date(),
          },
        }
      );

      console.log(
        "Response version 1 saved"
      );

      // =================================================
      // Tell frontend stream is finished
      // =================================================

      res.write(
        `data: ${JSON.stringify({
          done: true,

          messageId:
            messageId.toString(),

          version: 1,
        })}\n\n`
      );

      res.end();
    } catch (error) {
      console.error(
        "Streaming error:"
      );

      console.error(error);

      const errorMessageText =
        error?.message || "";

      const isRateLimit =
        error?.status === 429 ||
        error?.code === 429 ||
        errorMessageText.includes(
          "429"
        ) ||
        errorMessageText
          .toLowerCase()
          .includes(
            "rate limit"
          ) ||
        errorMessageText
          .toLowerCase()
          .includes(
            "too many requests"
          );

      const errorMessage =
        isRateLimit
          ? "Gemini rate limit reached. Please try again later."
          : "Failed to stream response";

      if (!res.headersSent) {
        return res
          .status(
            isRateLimit
              ? 429
              : 500
          )
          .json({
            error:
              errorMessage,
          });
      }

      res.write(
        `data: ${JSON.stringify({
          error:
            errorMessage,
        })}\n\n`
      );

      res.end();
    }
  }
);

// =====================================================
// REGENERATE RESPONSE
// =====================================================

app.post(
  "/api/chat/regenerate",
  async (req, res) => {
    const {
      messageId,
    } = req.body;

    console.log(
      "Regenerate request:",
      messageId
    );

    // =================================================
    // Validate message ID
    // =================================================

    if (!messageId) {
      return res.status(400).json({
        error:
          "messageId is required",
      });
    }

    let objectId;

    try {
      objectId =
        new ObjectId(messageId);
    } catch {
      return res.status(400).json({
        error:
          "Invalid messageId",
      });
    }

    // =================================================
    // SSE headers
    // =================================================

    res.setHeader(
      "Content-Type",
      "text/event-stream"
    );

    res.setHeader(
      "Cache-Control",
      "no-cache"
    );

    res.setHeader(
      "Connection",
      "keep-alive"
    );

    try {
      // =================================================
      // Find original message
      // =================================================

      const existingMessage =
        await messagesCollection.findOne({
          _id: objectId,
        });

      if (!existingMessage) {
        return res
          .status(404)
          .json({
            error:
              "Message not found",
          });
      }

      // =================================================
      // Determine next version
      // =================================================

      const versions =
        existingMessage.versions ||
        [];

      const nextVersion =
        versions.length + 1;

      console.log(
        "Generating version:",
        nextVersion
      );

      // =================================================
      // Generate new Gemini response
      // =================================================

      const response =
        await generateGeminiResponse(
          existingMessage.message
        );

      let fullResponse = "";

      // =================================================
      // Stream new response
      // =================================================

      for await (const chunk of response) {
        const text =
          chunk.text || "";

        if (!text) {
          continue;
        }

        fullResponse += text;

        res.write(
          `data: ${JSON.stringify({
            text,
          })}\n\n`
        );
      }

      // =================================================
      // Create version object
      // =================================================

      const newVersion = {
        version:
          nextVersion,

        text:
          fullResponse,

        createdAt:
          new Date(),
      };

      // =================================================
      // Save new version
      // =================================================

      await messagesCollection.updateOne(
        {
          _id: objectId,
        },
        {
          $push: {
            versions:
              newVersion,
          },

          $set: {
            response:
              fullResponse,

            activeVersion:
              nextVersion,

            updatedAt:
              new Date(),
          },
        }
      );

      console.log(
        `Response version ${nextVersion} saved`
      );

      // =================================================
      // Finish stream
      // =================================================

      res.write(
        `data: ${JSON.stringify({
          done: true,

          messageId:
            messageId,

          version:
            nextVersion,
        })}\n\n`
      );

      res.end();
    } catch (error) {
      console.error(
        "Regenerate error:"
      );

      console.error(error);

      const errorMessageText =
        error?.message || "";

      const isRateLimit =
        error?.status === 429 ||
        error?.code === 429 ||
        errorMessageText.includes(
          "429"
        ) ||
        errorMessageText
          .toLowerCase()
          .includes(
            "rate limit"
          );

      const errorMessage =
        isRateLimit
          ? "Gemini rate limit reached. Please try again later."
          : "Failed to regenerate response";

      if (!res.headersSent) {
        return res
          .status(
            isRateLimit
              ? 429
              : 500
          )
          .json({
            error:
              errorMessage,
          });
      }

      res.write(
        `data: ${JSON.stringify({
          error:
            errorMessage,
        })}\n\n`
      );

      res.end();
    }
  }
);

// =====================================================
// SWITCH RESPONSE VERSION
// =====================================================

app.post(
  "/api/chat/version",
  async (req, res) => {
    try {
      const {
        messageId,
        version,
      } = req.body;

      console.log(
        "Switch version request:",
        {
          messageId,
          version,
        }
      );

      // =================================================
      // Validate
      // =================================================

      if (
        !messageId ||
        !version
      ) {
        return res.status(400).json({
          error:
            "messageId and version are required",
        });
      }

      let objectId;

      try {
        objectId =
          new ObjectId(messageId);
      } catch {
        return res.status(400).json({
          error:
            "Invalid messageId",
        });
      }

      // =================================================
      // Find message
      // =================================================

      const messageDoc =
        await messagesCollection.findOne({
          _id: objectId,
        });

      if (!messageDoc) {
        return res.status(404).json({
          error:
            "Message not found",
        });
      }

      // =================================================
      // Find requested version
      // =================================================

      const selectedVersion =
        (
          messageDoc.versions ||
          []
        ).find(
          (item) =>
            item.version ===
            Number(version)
        );

      if (!selectedVersion) {
        return res.status(404).json({
          error:
            "Requested version not found",
        });
      }

      // =================================================
      // Update active version
      // =================================================

      await messagesCollection.updateOne(
        {
          _id: objectId,
        },
        {
          $set: {
            response:
              selectedVersion.text,

            activeVersion:
              selectedVersion.version,

            updatedAt:
              new Date(),
          },
        }
      );

      console.log(
        "Active version changed to:",
        selectedVersion.version
      );

      res.json({
        success: true,

        messageId,

        version:
          selectedVersion.version,

        response:
          selectedVersion.text,
      });
    } catch (error) {
      console.error(
        "Version switch error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to switch response version",
      });
    }
  }
);

// =====================================================
// GET CHAT HISTORY
// =====================================================

app.get(
  "/api/chat/:conversationId",
  async (req, res) => {
    try {
      const {
        conversationId,
      } = req.params;

      console.log(
        "Loading history for:",
        conversationId
      );

      const history =
        await messagesCollection
          .find({
            conversationId,
          })
          .sort({
            createdAt: 1,
          })
          .toArray();

      console.log(
        "History found:",
        history.length
      );

      // =================================================
      // Return history with versions
      // =================================================

      const formattedHistory =
        history.map((item) => ({
          _id:
            item._id.toString(),

          conversationId:
            item.conversationId,

          message:
            item.message,

          response:
            item.response,

          activeVersion:
            item.activeVersion ||
            1,

          versions:
            item.versions ||
            [],

          createdAt:
            item.createdAt,

          updatedAt:
            item.updatedAt,
        }));

      res.json({
        history:
          formattedHistory,
      });
    } catch (error) {
      console.error(
        "History error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to load chat history",
      });
    }
  }
);

// =====================================================
// POST FEEDBACK
// =====================================================

app.post(
  "/api/chat/feedback",
  async (req, res) => {
    try {
      const {
        conversationId,
        messageId,
        rating,
        reason,
      } = req.body;

      console.log(
        "Feedback received:",
        {
          conversationId,
          messageId,
          rating,
          reason,
        }
      );

      // =================================================
      // Validate
      // =================================================

      if (
        !conversationId ||
        !rating
      ) {
        return res.status(400).json({
          error:
            "conversationId and rating are required",
        });
      }

      if (
        rating !== "up" &&
        rating !== "down"
      ) {
        return res.status(400).json({
          error:
            "Rating must be either up or down",
        });
      }

      // =================================================
      // Save feedback
      // =================================================

      const result =
        await feedbackCollection.insertOne({
          conversationId,

          messageId:
            messageId || null,

          rating,

          reason:
            reason || null,

          createdAt:
            new Date(),
        });

      console.log(
        "Feedback saved:",
        result.insertedId.toString()
      );

      res.json({
        success: true,

        feedbackId:
          result.insertedId,
      });
    } catch (error) {
      console.error(
        "Feedback error:",
        error
      );

      res.status(500).json({
        error:
          "Failed to save feedback",
      });
    }
  }
);

// =====================================================
// Health Check
// =====================================================

app.get(
  "/",
  (req, res) => {
    res.json({
      status: "ok",
      message:
        "Chat backend is running",
    });
  }
);

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  await connectDB();

  app.listen(
    PORT,
    () => {
      console.log(
        `Backend running on http://localhost:${PORT}`
      );
    }
  );
}

startServer();