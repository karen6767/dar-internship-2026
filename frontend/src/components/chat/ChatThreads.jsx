function ChatThreads({
  threads = [],
  activeConversationId,
  onSelectThread,
  onNewChat,
}) {
  return (
    <div className="w-64 border-r bg-gray-50 flex flex-col">

      {/* Header */}

      <div className="p-4 border-b bg-white">

        <button
          onClick={onNewChat}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition"
        >
          + New Chat
        </button>

      </div>

      {/* Threads */}

      <div className="flex-1 overflow-y-auto p-2">

        {threads.length === 0 ? (
          <p className="text-sm text-gray-500 text-center mt-4">
            No conversations yet
          </p>
        ) : (
          threads.map(
            (thread) => {
              const conversationId =
                thread.conversationId;

              return (
                <button
                  key={
                    conversationId
                  }
                  onClick={() =>
                    onSelectThread(
                      conversationId
                    )
                  }
                  className={`w-full text-left px-3 py-3 rounded-lg mb-1 transition ${
                    activeConversationId ===
                    conversationId
                      ? "bg-blue-100 text-blue-700"
                      : "hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  <p className="text-sm font-medium truncate">
                    {thread.title ||
                      thread.message ||
                      "New conversation"}
                  </p>
                </button>
              );
            }
          )
        )}

      </div>

    </div>
  );
}

export default ChatThreads;