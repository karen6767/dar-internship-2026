import { useState } from "react";

function ChatInput({ onSend }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;

    onSend(message);
    setMessage("");
  };

  return (
    <div className="border-t p-4 flex gap-3">
      <input
        type="text"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSend();
          }
        }}
        className="flex-1 border rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleSend}
        className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
      >
        Send
      </button>
    </div>
  );
}

export default ChatInput;