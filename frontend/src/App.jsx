import { useEffect, useState } from "react";
import ChatHeader from "./components/chat/ChatHeader";
import ChatMessages from "./components/chat/ChatMessages";
import ChatInput from "./components/chat/ChatInput";
import { sendMessage, getChatHistory } from "./services/api";

function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const conversationId = "demo-conversation";

  // Load chat history when the app starts
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getChatHistory(conversationId);

        const formattedMessages = [];

        history.forEach((item) => {
          formattedMessages.push({
            sender: "user",
            text: item.message,
          });

          formattedMessages.push({
            sender: "ai",
            text: item.response,
          });
        });

        setMessages(formattedMessages);
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };

    loadHistory();
  }, []);

  const handleSendMessage = async (message) => {
    if (isLoading) return;

    setIsLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: message,
      },
    ]);

    // Add empty AI message
    setMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: "",
      },
    ]);

    try {
      await sendMessage(message, conversationId, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];

          const lastMessageIndex = updated.length - 1;

          updated[lastMessageIndex] = {
            ...updated[lastMessageIndex],
            text: updated[lastMessageIndex].text + chunk,
          };

          return updated;
        });
      });
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((prev) => {
        const updated = [...prev];

        const lastMessageIndex = updated.length - 1;

        updated[lastMessageIndex] = {
          ...updated[lastMessageIndex],
          text: "Sorry, something went wrong.",
        };

        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl h-[600px] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
        <ChatHeader />

        <ChatMessages messages={messages} />

        <ChatInput onSend={handleSendMessage} />
      </div>
    </div>
  );
}

export default App;