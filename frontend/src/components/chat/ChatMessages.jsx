function ChatMessages({ messages }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${
            message.sender === "user"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          <div
            className={`rounded-lg px-4 py-3 max-w-[75%] ${
              message.sender === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100"
            }`}
          >
            <p>{message.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatMessages;