import React, { useEffect, useRef } from "react";

import ReactMarkdown from "react-markdown";

function ChatMessages({
  messages,
  isLoading,
  onRegenerate,
  onSwitchVersion,
  onFeedback,
}) {
  const messagesEndRef = useRef(null);

  // =====================================================
  // Auto Scroll
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // =====================================================
  // Render Inline Citations
  // =====================================================

  const renderTextWithCitations = (children) => {
    if (
      typeof children !== "string"
    ) {
      return children;
    }

    const parts =
      children.split(
        /(\[\d+\])/g
      );

    return parts.map(
      (part, index) => {
        const match =
          part.match(
            /^\[(\d+)\]$/
          );

        if (!match) {
          return (
            <span key={index}>
              {part}
            </span>
          );
        }

        const citationNumber =
          match[1];

        return (
          <span
            key={index}
            className="relative inline-block group"
          >
            <span
              className="ml-0.5 text-blue-600 font-medium cursor-help hover:underline"
              title={`Citation ${citationNumber}`}
            >
              [{citationNumber}]
            </span>

            {/* =================================================
                Citation Tooltip
                ================================================= */}

            <span
              className="
                absolute
                left-1/2
                bottom-full
                mb-2
                -translate-x-1/2
                hidden
                group-hover:block
                z-50
                w-64
                rounded-lg
                bg-gray-900
                text-white
                text-xs
                p-3
                shadow-lg
              "
            >
              <span className="block font-semibold mb-1">
                Source {citationNumber}
              </span>

              <span className="block text-gray-300">
                Citation source information
              </span>
            </span>
          </span>
        );
      }
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">

      {/* =================================================
          Messages
          ================================================= */}

      {messages.map(
        (message, index) => {
          const isUser =
            message.sender ===
            "user";

          const versions =
            message.versions || [];

          const activeVersion =
            Number(
              message.activeVersion ||
                1
            );

          const hasVersions =
            !isUser &&
            versions.length > 0;

          const currentVersionIndex =
            versions.findIndex(
              (version) =>
                Number(
                  version.version
                ) ===
                activeVersion
            );

          const canGoPrevious =
            hasVersions &&
            currentVersionIndex >
              0;

          const canGoNext =
            hasVersions &&
            currentVersionIndex >=
              0 &&
            currentVersionIndex <
              versions.length - 1;

          return (
            <div
              key={
                message.id ||
                `${index}-${message.sender}`
              }
              className={`flex ${
                isUser
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div className="max-w-[75%]">

                {/* =================================================
                    Message Bubble
                    ================================================= */}

                <div
                  className={`rounded-lg px-4 py-3 ${
                    isUser
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >

                  {/* =================================================
                      Message Content
                      ================================================= */}

                  <div className="text-sm leading-6">

                    <ReactMarkdown
                      components={{

                        // ===============================
                        // Paragraph
                        // ===============================

                        p: ({
                          children,
                        }) => (
                          <p className="mb-3 last:mb-0">
                            {React.Children
                              ? React.Children.map(
                                  children,
                                  (child) =>
                                    renderTextWithCitations(
                                      child
                                    )
                                )
                              : children}
                          </p>
                        ),

                        // ===============================
                        // H1
                        // ===============================

                        h1: ({
                          children,
                        }) => (
                          <h1 className="text-xl font-bold mb-3">
                            {children}
                          </h1>
                        ),

                        // ===============================
                        // H2
                        // ===============================

                        h2: ({
                          children,
                        }) => (
                          <h2 className="text-lg font-bold mb-2 mt-4">
                            {children}
                          </h2>
                        ),

                        // ===============================
                        // H3
                        // ===============================

                        h3: ({
                          children,
                        }) => (
                          <h3 className="text-base font-semibold mb-2 mt-3">
                            {children}
                          </h3>
                        ),

                        // ===============================
                        // Unordered List
                        // ===============================

                        ul: ({
                          children,
                        }) => (
                          <ul className="list-disc ml-5 mb-3 space-y-1">
                            {children}
                          </ul>
                        ),

                        // ===============================
                        // Ordered List
                        // ===============================

                        ol: ({
                          children,
                        }) => (
                          <ol className="list-decimal ml-5 mb-3 space-y-1">
                            {children}
                          </ol>
                        ),

                        // ===============================
                        // List Item
                        // ===============================

                        li: ({
                          children,
                        }) => (
                          <li>
                            {children}
                          </li>
                        ),

                        // ===============================
                        // Bold
                        // ===============================

                        strong: ({
                          children,
                        }) => (
                          <strong className="font-bold">
                            {children}
                          </strong>
                        ),

                        // ===============================
                        // Horizontal Line
                        // ===============================

                        hr: () => (
                          <hr className="my-4 border-gray-300" />
                        ),

                        // ===============================
                        // Code
                        // ===============================

                        code: ({
                          inline,
                          children,
                        }) =>
                          inline ? (
                            <code className="bg-gray-200 px-1.5 py-0.5 rounded text-sm">
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-3">
                              <code>
                                {children}
                              </code>
                            </pre>
                          ),
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>

                  </div>
                </div>

                {/* =================================================
                    AI Controls
                    ================================================= */}

                {!isUser &&
                  message.messageId &&
                  message.text &&
                  !isLoading && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap">

                      {/* =================================================
                          Regenerate
                          ================================================= */}

                      <button
                        type="button"
                        onClick={() =>
                          onRegenerate(
                            message.messageId
                          )
                        }
                        className="text-xs px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50"
                        title="Regenerate response"
                      >
                        ↻ Regenerate
                      </button>

                      {/* =================================================
                          Version Controls
                          ================================================= */}

                      {hasVersions && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onSwitchVersion(
                                message.messageId,
                                activeVersion -
                                  1
                              )
                            }
                            disabled={
                              !canGoPrevious
                            }
                            className="w-7 h-7 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Previous version"
                          >
                            ←
                          </button>

                          <span className="text-xs text-gray-500 min-w-[45px] text-center">
                            {activeVersion} /{" "}
                            {versions.length}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              onSwitchVersion(
                                message.messageId,
                                activeVersion +
                                  1
                              )
                            }
                            disabled={
                              !canGoNext
                            }
                            className="w-7 h-7 rounded-md border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Next version"
                          >
                            →
                          </button>
                        </>
                      )}

                      {/* =================================================
                          Feedback
                          ================================================= */}

                      <div className="flex items-center gap-1 ml-1">

                        <button
                          type="button"
                          onClick={() =>
                            onFeedback(
                              message.messageId,
                              "up"
                            )
                          }
                          className="w-7 h-7 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                          title="Good response"
                        >
                          👍
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onFeedback(
                              message.messageId,
                              "down"
                            )
                          }
                          className="w-7 h-7 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-800"
                          title="Bad response"
                        >
                          👎
                        </button>

                      </div>

                    </div>
                  )}

              </div>
            </div>
          );
        }
      )}

      {/* =================================================
          Loading Indicator
          ================================================= */}

      {isLoading && (
        <div className="flex justify-start">

          <div className="bg-gray-100 text-gray-600 rounded-lg px-4 py-3">

            <div className="flex items-center gap-2">

              <span>
                AI is thinking
              </span>

              <span className="flex gap-1">

                <span className="animate-bounce">
                  .
                </span>

                <span
                  className="animate-bounce"
                  style={{
                    animationDelay:
                      "0.15s",
                  }}
                >
                  .
                </span>

                <span
                  className="animate-bounce"
                  style={{
                    animationDelay:
                      "0.3s",
                  }}
                >
                  .
                </span>

              </span>

            </div>
          </div>
        </div>
      )}

      {/* =================================================
          Auto Scroll Target
          ================================================= */}

      <div
        ref={messagesEndRef}
      />

    </div>
  );
}

export default ChatMessages;