// src/components/chat/TextChatUI.jsx
import React, { useState, Suspense } from "react";
import MessageList from "../MessageList";
const Picker = React.lazy(() => import("@emoji-mart/react"));

export default function TextChatUI(props) {
  const {
    messages,
    partnerTyping,
    input,
    showEmoji,
    canSend,
    handleTyping,
    sendMsg,
    setShowEmoji,
    sendBusyRef,
    validateChatMessage,
    setInput,
    messageFlag,
    SetMessageFlag,
    validationMessage,
    SetValidationMessage,
    isFriendChat,
    isFriendOnline,
    isFriendshipAccepted,
  } = props;

  const [emojiData, setEmojiData] = useState(null);
  const [isEmojiLoading, setIsEmojiLoading] = useState(false);

  const handleInputChange = (e) => {
    handleTyping(e.target.value);
    const res = validateChatMessage(e.target.value);
    SetMessageFlag(res.flag);
    SetValidationMessage(res.message);
  };

  const toggleEmojiPicker = async () => {
    if (!showEmoji && !emojiData) {
      setIsEmojiLoading(true);
      const mod = await import("@emoji-mart/data");
      setEmojiData(mod.default);
      setIsEmojiLoading(false);
    }
    setShowEmoji((v) => !v);
  };

  let inputPlaceholder = "Type a message...";
  if (!canSend) {
    if (isFriendChat) {
      if (!isFriendshipAccepted) {
        inputPlaceholder = "You are not friends. Send a request to chat.";
      } else if (!isFriendOnline) {
        inputPlaceholder = "Friend is offline. Messaging is disabled.";
      } else {
        inputPlaceholder = "Connecting to friend...";
      }
    } else {
      inputPlaceholder = "Partner has left the conversation.";
    }
  }

  return (
    <div className="d-flex flex-column h-100 bg-transparent">
      {/* Chat Messages */}
      <div className="message-list-container flex-grow-1 mb-3 p-3 overflow-auto">
        <MessageList messages={messages} partnerTyping={partnerTyping} />
      </div>

      {/* Validation Warning Alert */}
      {validationMessage && (
        <div className="alert alert-danger border-0 py-2 px-3 mx-2 mb-2 rounded-3 text-center small fw-semibold animate-pulse shadow-sm">
          <i className="bi bi-shield-fill-exclamation me-2"></i>
          {validationMessage}
        </div>
      )}

      {/* Input Box Wrapper */}
      <div
        className="mt-auto p-2 rounded-pill mx-2 mb-2"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid var(--glass-border)",
          position: "relative",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)"
        }}
      >
        <div className="d-flex align-items-center gap-2">
          {/* Emoji Picker Button */}
          <button
            className="btn btn-dark rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center border-0"
            onClick={toggleEmojiPicker}
            style={{ width: "42px", height: "42px", background: "rgba(255, 255, 255, 0.08)", transition: "background 0.2s" }}
            type="button"
            disabled={!canSend}
          >
            <span style={{ fontSize: "1.2rem" }}>😊</span>
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmoji && (
            <div
              className="position-absolute bottom-100 mb-2 start-0"
              style={{ zIndex: 999 }}
            >
              <Suspense
                fallback={
                  <div className="p-3 bg-dark border border-secondary border-opacity-30 rounded shadow text-white small">
                    Loading Emojis...
                  </div>
                }
              >
                {isEmojiLoading ? (
                  <div className="p-3 bg-dark border border-secondary border-opacity-30 rounded shadow text-white small">
                    Loading Emojis...
                  </div>
                ) : (
                  emojiData && (
                    <Picker
                      data={emojiData}
                      onEmojiSelect={(emoji) =>
                        setInput((prev) => prev + (emoji?.native || ""))
                      }
                      previewPosition="none"
                      theme="dark"
                    />
                  )
                )}
              </Suspense>
            </div>
          )}

          <input
            className="form-control border-0 flex-grow-1 px-3 py-2 rounded-pill shadow-none bg-transparent"
            style={{
              fontSize: "15px",
              color: "var(--text-main)"
            }}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !sendBusyRef &&
              canSend &&
              !messageFlag &&
              sendMsg()
            }
            placeholder={inputPlaceholder}
            disabled={!canSend}
          />

          {/* Send Button */}
          <button
            className="btn btn-glowing-primary rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center"
            onClick={sendMsg}
            disabled={messageFlag || !canSend || !input.trim() || sendBusyRef}
            style={{
              width: "44px",
              height: "44px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              className="bi bi-send-fill"
              viewBox="0 0 16 16"
            >
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.9; }
          50% { opacity: 0.7; }
        }
        .animate-pulse {
          animation: pulse 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
