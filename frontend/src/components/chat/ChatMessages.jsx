import ReactMarkdown from "react-markdown";

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
                : "bg-gray-100 text-gray-900"
            }`}
          >
            <div className="text-sm leading-6">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl font-bold mb-3">
                      {children}
                    </h1>
                  ),

                  h2: ({ children }) => (
                    <h2 className="text-lg font-bold mb-2 mt-4">
                      {children}
                    </h2>
                  ),

                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold mb-2 mt-3">
                      {children}
                    </h3>
                  ),

                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0">
                      {children}
                    </p>
                  ),

                  ul: ({ children }) => (
                    <ul className="list-disc ml-5 mb-3 space-y-1">
                      {children}
                    </ul>
                  ),

                  ol: ({ children }) => (
                    <ol className="list-decimal ml-5 mb-3 space-y-1">
                      {children}
                    </ol>
                  ),

                  li: ({ children }) => (
                    <li>{children}</li>
                  ),

                  strong: ({ children }) => (
                    <strong className="font-bold">
                      {children}
                    </strong>
                  ),

                  hr: () => (
                    <hr className="my-4 border-gray-300" />
                  ),

                  code: ({ inline, children }) =>
                    inline ? (
                      <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm">
                        {children}
                      </code>
                    ) : (
                      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-3">
                        <code>{children}</code>
                      </pre>
                    ),
                }}
              >
                {message.text}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChatMessages;