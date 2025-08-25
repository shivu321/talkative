// src/components/chat/TextChatUI.jsx
import React, { useState, Suspense } from 'react';
import MessageList from '../MessageList';
const Picker = React.lazy(() => import("@emoji-mart/react"));

export default function TextChatUI(props) {
  const {
    messages, partnerTyping, input, showEmoji, canSend, handleTyping, sendMsg,
    setShowEmoji, sendBusyRef, validateChatMessage, setInput, messageFlag,
    SetMessageFlag, validationMessage, SetValidationMessage,
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
    <div className="d-flex flex-column h-100">
      <div className="message-list-container flex-grow-1 mb-3">
        <MessageList messages={messages} partnerTyping={partnerTyping} />
      </div>
      {validationMessage && <small className="text-danger mt-1 d-block">{validationMessage}</small>}
      <div className="mt-auto" style={{ borderRadius: "37px", border: "1px solid rgb(109, 117, 242)" }}>
        <div className="position-relative">
          {showEmoji && (
            <div className="position-absolute bottom-100 mb-2">
              <Suspense fallback={<div className="p-2 bg-light rounded">Loading...</div>}>
                {isEmojiLoading ? (
                  <div className="p-2 bg-light rounded">Loading Emojis...</div>
                ) : (
                  emojiData && (
                    <Picker
                      data={emojiData}
                      onEmojiSelect={(emoji) => setInput((prev) => prev + (emoji?.native || ""))}
                      previewPosition="none"
                      theme="light"
                    />
                  )
                )}
              </Suspense>
            </div>
          )}
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-light rounded-circle flex-shrink-0" onClick={toggleEmojiPicker}>😊</button>
            <input
              className="form-control rounded-pill"
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && !sendBusyRef && canSend && !messageFlag && sendMsg()}
              placeholder={canSend ? "Type a message..." : "Partner has left."}
              disabled={!canSend}
            />
            <button
              className="btn btn-primary rounded-circle flex-shrink-0"
              onClick={sendMsg}
              disabled={messageFlag || !canSend || !input.trim() || sendBusyRef}
              style={{ width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-send-fill" viewBox="0 0 16 16">
                <path d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083l6-15Zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471-.47 1.178Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
