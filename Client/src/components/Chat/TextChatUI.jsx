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

  return (
    <div className="d-flex flex-column h-100 p-2 bg-light">
      {/* Chat Messages */}
      <div className="message-list-container flex-grow-1 mb-2 p-2 rounded bg-white shadow-sm overflow-auto">
        <MessageList messages={messages} partnerTyping={partnerTyping} />
      </div>

      {/* Validation Message */}
      {validationMessage && (
        <small className="text-danger mb-2 d-block text-center fw-semibold">
          {validationMessage}
        </small>
      )}

      {/* Input Box */}
      <div
        className="mt-auto bg-white shadow-sm p-2 rounded-pill"
        style={{
          border: "1px solid rgb(109, 117, 242)",
          position: "relative",
        }}
      >
        <div className="d-flex align-items-center gap-2">
          {/* Emoji Picker Button */}
          <button
            className="btn btn-light rounded-circle flex-shrink-0 shadow-sm"
            onClick={toggleEmojiPicker}
            style={{ width: "42px", height: "42px" }}
          >
            😊
          </button>

          {/* Emoji Picker Dropdown */}
          {showEmoji && (
            <div
              className="position-absolute bottom-100 mb-2 start-0"
              style={{ zIndex: 999 }}
            >
              <Suspense
                fallback={
                  <div className="p-2 bg-light rounded shadow">Loading...</div>
                }
              >
                {isEmojiLoading ? (
                  <div className="p-2 bg-light rounded shadow">
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
                      theme="light"
                    />
                  )
                )}
              </Suspense>
            </div>
          )}

          {/* Message Input */}
          <input
            className="form-control border-0 flex-grow-1 px-3 py-2 rounded-pill shadow-none"
            style={{
              backgroundColor: "#f8f9fa",
              fontSize: "15px",
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
            placeholder={canSend ? "Type a message..." : "Partner has left."}
            disabled={!canSend}
          />

          {/* Send Button */}
          <button
            className="btn btn-primary rounded-circle flex-shrink-0 shadow-sm"
            onClick={sendMsg}
            disabled={messageFlag || !canSend || !input.trim() || sendBusyRef}
            style={{
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="currentColor"
              className="bi bi-send-fill"
              viewBox="0 0 16 16"
            >
              <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
