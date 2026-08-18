const API_BASE_URL =
  "http://localhost:5000/api/chat";

// =====================================================
// Generic SSE reader
// =====================================================

async function readSSEStream(
  response,
  onChunk,
  onComplete
) {
  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser"
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder("utf-8");

  let buffer = "";

  while (true) {
    const {
      value,
      done,
    } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(
      value,
      {
        stream: true,
      }
    );

    buffer = buffer.replace(
      /\r\n/g,
      "\n"
    );

    const events =
      buffer.split("\n\n");

    buffer =
      events.pop() || "";

    for (const event of events) {
      const lines =
        event.split("\n");

      for (const line of lines) {
        if (
          !line.startsWith("data:")
        ) {
          continue;
        }

        const rawData =
          line.slice(5).trim();

        if (!rawData) {
          continue;
        }

        let data;

        try {
          data =
            JSON.parse(rawData);
        } catch (error) {
          console.error(
            "Invalid SSE JSON:",
            rawData
          );

          continue;
        }

        // =============================================
        // Server Error
        // =============================================

        if (data.error) {
          throw new Error(
            data.error
          );
        }

        // =============================================
        // Text Chunk
        // =============================================

        if (
          typeof data.text ===
          "string"
        ) {
          onChunk(data.text);
        }

        // =============================================
        // Stream Complete
        // =============================================

        if (data.done) {
          if (onComplete) {
            onComplete({
              messageId:
                data.messageId,

              version:
                data.version,
            });
          }

          return;
        }
      }
    }
  }
}

// =====================================================
// Send Message using SSE
// =====================================================

export async function sendMessage(
  message,
  conversationId,
  onChunk,
  onComplete
) {
  const response =
    await fetch(
      `${API_BASE_URL}/stream`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          message,
          conversationId,
        }),
      }
    );

  // ===================================================
  // HTTP Errors
  // ===================================================

  if (!response.ok) {
    let errorMessage =
      "Failed to send message";

    try {
      const data =
        await response.json();

      if (data.error) {
        errorMessage =
          data.error;
      }
    } catch {
      // Keep default
    }

    if (
      response.status === 429
    ) {
      throw new Error(
        "Gemini rate limit reached. Please try again later."
      );
    }

    throw new Error(
      errorMessage
    );
  }

  await readSSEStream(
    response,
    onChunk,
    onComplete
  );
}

// =====================================================
// Regenerate Response using SSE
// =====================================================

export async function regenerateResponse(
  messageId,
  onChunk,
  onComplete
) {
  const response =
    await fetch(
      `${API_BASE_URL}/regenerate`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          messageId,
        }),
      }
    );

  // ===================================================
  // HTTP Errors
  // ===================================================

  if (!response.ok) {
    let errorMessage =
      "Failed to regenerate response";

    try {
      const data =
        await response.json();

      if (data.error) {
        errorMessage =
          data.error;
      }
    } catch {
      // Keep default
    }

    if (
      response.status === 429
    ) {
      throw new Error(
        "Gemini rate limit reached. Please try again later."
      );
    }

    throw new Error(
      errorMessage
    );
  }

  await readSSEStream(
    response,
    onChunk,
    onComplete
  );
}

// =====================================================
// Switch Active Response Version
// =====================================================

export async function switchResponseVersion(
  messageId,
  version
) {
  const response =
    await fetch(
      `${API_BASE_URL}/version`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          messageId,
          version,
        }),
      }
    );

  if (!response.ok) {
    let errorMessage =
      "Failed to switch response version";

    try {
      const data =
        await response.json();

      if (data.error) {
        errorMessage =
          data.error;
      }
    } catch {
      // Keep default
    }

    throw new Error(
      errorMessage
    );
  }

  return await response.json();
}

// =====================================================
// Get Chat History
// =====================================================

export async function getChatHistory(
  conversationId
) {
  if (!conversationId) {
    return [];
  }

  const response =
    await fetch(
      `${API_BASE_URL}/${encodeURIComponent(
        conversationId
      )}`
    );

  if (!response.ok) {
    throw new Error(
      "Failed to load chat history"
    );
  }

  const data =
    await response.json();

  console.log(
    "getChatHistory response:",
    data
  );

  return data.history || [];
}

// =====================================================
// Get All Chat Threads
// =====================================================

export async function getChatThreads() {
  const response =
    await fetch(
      `${API_BASE_URL}/threads`
    );

  if (!response.ok) {
    throw new Error(
      "Failed to load chat threads"
    );
  }

  const data =
    await response.json();

  console.log(
    "getChatThreads response:",
    data
  );

  return data.threads || [];
}

// =====================================================
// Submit Feedback
// =====================================================

export async function submitFeedback(
  conversationId,
  messageId,
  rating,
  reason = null
) {
  const response =
    await fetch(
      `${API_BASE_URL}/feedback`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          conversationId,
          messageId,
          rating,
          reason,
        }),
      }
    );

  if (!response.ok) {
    let errorMessage =
      "Failed to submit feedback";

    try {
      const data =
        await response.json();

      if (data.error) {
        errorMessage =
          data.error;
      }
    } catch {
      // Keep default
    }

    throw new Error(
      errorMessage
    );
  }

  return await response.json();
}