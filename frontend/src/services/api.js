export async function sendMessage(message, conversationId, onChunk) {
  const response = await fetch(
    "http://localhost:5000/api/chat/stream",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        message,
        conversationId,
      }),
    }
  );

  // Handle HTTP errors
  if (!response.ok) {
    let errorMessage = "Failed to send message";

    try {
      const data = await response.json();

      if (data.error) {
        errorMessage = data.error;
      }
    } catch {
      // Keep the default error message
    }

    // Handle Gemini rate limit specifically
    if (response.status === 429) {
      throw new Error(
        "Gemini rate limit reached. Please try again later."
      );
    }

    throw new Error(errorMessage);
  }

  // Make sure streaming is supported
  if (!response.body) {
    throw new Error(
      "Streaming is not supported by this browser"
    );
  }

  const reader = response.body.getReader();

  const decoder = new TextDecoder("utf-8");

  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, {
      stream: true,
    });

    const events = buffer.split("\n\n");

    buffer = events.pop();

    for (const event of events) {
      if (!event.startsWith("data: ")) {
        continue;
      }

      const data = JSON.parse(event.slice(6));

      // Error sent through SSE
      if (data.error) {
        throw new Error(data.error);
      }

      // Normal streamed text
      if (data.text) {
        onChunk(data.text);
      }

      // Streaming finished
      if (data.done) {
        return;
      }
    }
  }
}


// Get chat history
export async function getChatHistory(conversationId) {
  const response = await fetch(
    `http://localhost:5000/api/chat/${conversationId}`
  );

  if (!response.ok) {
    throw new Error("Failed to load chat history");
  }

  const data = await response.json();

  return data.history;
}