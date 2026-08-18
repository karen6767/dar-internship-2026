import { useEffect, useState } from "react";

import ChatHeader from "./components/chat/ChatHeader";
import ChatMessages from "./components/chat/ChatMessages";
import ChatInput from "./components/chat/ChatInput";
import ChatThreads from "./components/chat/ChatThreads";

import {
  sendMessage,
  getChatHistory,
  getChatThreads,
  regenerateResponse,
  switchResponseVersion,
  submitFeedback,
} from "./services/api";

function App() {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeConversationId, setActiveConversationId] =
    useState(null);

  const [isLoading, setIsLoading] = useState(false);

  // =====================================================
  // Create Conversation ID
  // =====================================================

  const createConversationId = () => {
    return crypto.randomUUID();
  };

  // =====================================================
  // Create New Chat
  // =====================================================

  const createNewChat = () => {
    if (isLoading) return;

    const newConversationId =
      createConversationId();

    console.log(
      "New conversation:",
      newConversationId
    );

    setActiveConversationId(
      newConversationId
    );

    setMessages([]);
  };

  // =====================================================
  // Load Chat History
  // =====================================================

  const loadHistory = async (
    conversationId
  ) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      console.log(
        "Loading history:",
        conversationId
      );

      const history =
        await getChatHistory(
          conversationId
        );

      console.log(
        "History received:",
        history
      );

      console.log(
        "FULL HISTORY:",
        JSON.stringify(
          history,
          null,
          2
        )
      );

      const formattedMessages = [];

      history.forEach((item) => {
        // =================================================
        // User Message
        // =================================================

        if (item.message) {
          formattedMessages.push({
            id:
              `${item._id}-user`,

            messageId:
              item._id || null,

            conversationId:
              item.conversationId,

            sender: "user",

            text: item.message,
          });
        }

        // =================================================
        // AI Response
        // =================================================

        if (item.response) {
          formattedMessages.push({
            id:
              `${item._id}-ai`,

            messageId:
              item._id || null,

            conversationId:
              item.conversationId,

            sender: "ai",

            text: item.response,

            originalQuestion:
              item.message || "",

            activeVersion:
              item.activeVersion || 1,

            versions:
              item.versions || [],
          });
        }
      });

      setMessages(
        formattedMessages
      );
    } catch (error) {
      console.error(
        "Failed to load history:",
        error
      );

      setMessages([]);
    }
  };

  // =====================================================
  // Load Threads
  // =====================================================

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const data =
          await getChatThreads();

        console.log(
          "Loaded threads:",
          data
        );

        setThreads(data);

        // ===============================================
        // Existing chats
        // ===============================================

        if (data.length > 0) {
          const conversationId =
            data[0].conversationId;

          setActiveConversationId(
            conversationId
          );

          await loadHistory(
            conversationId
          );
        }

        // ===============================================
        // No chats
        // ===============================================

        else {
          createNewChat();
        }
      } catch (error) {
        console.error(
          "Failed to initialize app:",
          error
        );

        setThreads([]);

        createNewChat();
      }
    };

    initializeApp();
  }, []);

  // =====================================================
  // Select Existing Thread
  // =====================================================

  const handleSelectThread = async (
    conversationId
  ) => {
    if (isLoading) return;

    console.log(
      "Selected thread:",
      conversationId
    );

    setActiveConversationId(
      conversationId
    );

    await loadHistory(
      conversationId
    );
  };

  // =====================================================
  // Send Message
  // =====================================================

  const handleSendMessage = async (
    message
  ) => {
    if (isLoading) return;

    if (
      !message ||
      !message.trim()
    ) {
      return;
    }

    let conversationId =
      activeConversationId;

    // ===============================================
    // Create conversation if needed
    // ===============================================

    if (!conversationId) {
      conversationId =
        createConversationId();

      setActiveConversationId(
        conversationId
      );
    }

    console.log(
      "Sending message:",
      message
    );

    console.log(
      "Conversation ID:",
      conversationId
    );

    setIsLoading(true);

    // ===============================================
    // Add User Message
    // ===============================================

    const userMessage = {
      id:
        crypto.randomUUID(),

      sender: "user",

      text: message,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    // ===============================================
    // Temporary AI Message
    // ===============================================

    const aiMessageId =
      crypto.randomUUID();

    const aiMessage = {
      id:
        aiMessageId,

      sender: "ai",

      text: "",

      messageId: null,

      conversationId,

      originalQuestion:
        message,

      activeVersion: 1,

      versions: [],
    };

    setMessages((prev) => [
      ...prev,
      aiMessage,
    ]);

    try {
      // =============================================
      // Stream Gemini Response
      // =============================================

      await sendMessage(
        message,
        conversationId,

        // =============================================
        // Every Chunk
        // =============================================

        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id ===
              aiMessageId
                ? {
                    ...msg,

                    text:
                      msg.text +
                      chunk,
                  }
                : msg
            )
          );
        },

        // =============================================
        // Stream Complete
        // =============================================

        (result) => {
          console.log(
            "Stream completed:",
            result
          );

          if (
            result?.messageId
          ) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id ===
                aiMessageId
                  ? {
                      ...msg,

                      messageId:
                        result.messageId,

                      activeVersion:
                        result.version ||
                        1,

                      versions: [
                        {
                          version:
                            result.version ||
                            1,

                          text:
                            msg.text,

                          createdAt:
                            new Date(),
                        },
                      ],
                    }
                  : msg
              )
            );
          }
        }
      );

      // =============================================
      // Refresh Threads
      // =============================================

      const updatedThreads =
        await getChatThreads();

      console.log(
        "Updated threads:",
        updatedThreads
      );

      setThreads(
        updatedThreads
      );

      setActiveConversationId(
        conversationId
      );
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id ===
          aiMessageId
            ? {
                ...msg,

                text:
                  error?.message ||
                  "Sorry, something went wrong.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // Regenerate Response
  // =====================================================

  const handleRegenerate = async (
    messageId
  ) => {
    if (
      isLoading ||
      !messageId
    ) {
      return;
    }

    console.log(
      "Regenerating message:",
      messageId
    );

    setIsLoading(true);

    // ===============================================
    // Find target message
    // ===============================================

    const targetMessage =
      messages.find(
        (msg) =>
          msg.sender === "ai" &&
          msg.messageId ===
            messageId
      );

    if (!targetMessage) {
      console.error(
        "AI message not found:",
        messageId
      );

      setIsLoading(false);

      return;
    }

    // ===============================================
    // Clear target response
    // ===============================================

    setMessages((prev) =>
      prev.map((msg) =>
        msg.sender === "ai" &&
        msg.messageId ===
          messageId
          ? {
              ...msg,

              text: "",
            }
          : msg
      )
    );

    try {
      // =============================================
      // Regenerate
      // =============================================

      await regenerateResponse(
        messageId,

        // =============================================
        // Every Chunk
        // =============================================

        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.sender === "ai" &&
              msg.messageId ===
                messageId
                ? {
                    ...msg,

                    text:
                      msg.text +
                      chunk,
                  }
                : msg
            )
          );
        },

        // =============================================
        // Complete
        // =============================================

        (result) => {
          console.log(
            "Regeneration completed:",
            result
          );
        }
      );

      // =============================================
      // Reload history
      // =============================================

      await loadHistory(
        activeConversationId
      );

      // =============================================
      // Refresh threads
      // =============================================

      const updatedThreads =
        await getChatThreads();

      setThreads(
        updatedThreads
      );
    } catch (error) {
      console.error(
        "Regenerate error:",
        error
      );

      await loadHistory(
        activeConversationId
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =====================================================
  // Switch Response Version
  // =====================================================

  const handleSwitchVersion = async (
    messageId,
    version
  ) => {
    if (
      isLoading ||
      !messageId
    ) {
      return;
    }

    console.log(
      "Switching version:",
      {
        messageId,
        version,
      }
    );

    try {
      const result =
        await switchResponseVersion(
          messageId,
          version
        );

      console.log(
        "Version switched:",
        result
      );

      // =============================================
      // Update UI immediately
      // =============================================

      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === "ai" &&
          msg.messageId ===
            messageId
            ? {
                ...msg,

                text:
                  result.response,

                activeVersion:
                  result.version,
              }
            : msg
        )
      );
    } catch (error) {
      console.error(
        "Switch version error:",
        error
      );
    }
  };

  // =====================================================
  // Feedback
  // =====================================================

  const handleFeedback = async (
    messageId,
    rating
  ) => {
    if (
      !messageId ||
      !activeConversationId
    ) {
      return;
    }

    try {
      const result =
        await submitFeedback(
          activeConversationId,
          messageId,
          rating
        );

      console.log(
        "Feedback submitted:",
        result
      );
    } catch (error) {
      console.error(
        "Feedback error:",
        error
      );
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">

      <div className="w-full max-w-5xl h-[600px] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">

        {/* =============================================
            Header
            ============================================= */}

        <ChatHeader />

        <div className="flex flex-1 min-h-0">

          {/* ===========================================
              Sidebar / Threads
              =========================================== */}

          <ChatThreads
            threads={threads}
            activeConversationId={
              activeConversationId
            }
            onSelectThread={
              handleSelectThread
            }
            onNewChat={
              createNewChat
            }
          />

          {/* ===========================================
              Main Chat
              =========================================== */}

          <div className="flex-1 flex flex-col min-w-0">

            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onRegenerate={
                handleRegenerate
              }
              onSwitchVersion={
                handleSwitchVersion
              }
              onFeedback={
                handleFeedback
              }
            />

            <ChatInput
              onSend={
                handleSendMessage
              }
            />

          </div>
        </div>
      </div>
    </div>
  );
}

export default App;