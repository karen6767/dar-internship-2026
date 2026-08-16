import { useState } from "react";
import ChatHeader from "./components/chat/ChatHeader";
import ChatMessages from "./components/chat/ChatMessages";
import ChatInput from "./components/chat/ChatInput";
import { sendMessage } from "./services/api";

function App() {
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! How can I help you today?",
    },
    {
      sender: "user",
      text: "I want to practice interview questions.",
    },
    {
      sender: "ai",
      text: "Great! Which track would you like to practice?",
    },
  ]);

  const handleSendMessage = async (message) => {
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: message },
    ]);

    const response = await sendMessage(message);

    setMessages((prev) => [
      ...prev,
      { sender: "ai", text: response.reply },
    ]);
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