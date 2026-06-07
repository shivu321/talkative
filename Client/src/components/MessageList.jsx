// MessageList.jsx
import React, { useEffect, useRef } from 'react';
import "./messages.css";

export default function MessageList({ messages = [], partnerTyping }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping]);

  return (
    <div className="p-1 d-flex flex-column gap-2" style={{ background: "transparent" }}>
      {messages.map((msg, idx) => (
        <div
          key={msg.messageId || idx}
          className={`d-flex ${
            msg.sys
              ? 'justify-content-center'
              : msg.from === 'me'
              ? 'justify-content-end'
              : 'justify-content-start'
          }`}
        >
          <div
            className={`px-3 py-2 shadow-sm ${
              msg.sys
                ? 'bg-secondary bg-opacity-10 text-muted small fst-italic rounded-pill px-4'
                : msg.from === 'me'
                ? 'chat-bubble-me rounded-4 rounded-end-0 text-white'
                : 'chat-bubble-partner rounded-4 rounded-start-0 text-white'
            }`}
            style={{ 
              maxWidth: '82%', 
              wordWrap: 'break-word', 
              fontSize: msg.sys ? '0.85rem' : '0.95rem',
              lineHeight: '1.4'
            }}
          >
            {msg.text}
          </div>
        </div>
      ))}

      {partnerTyping && (
        <div className="d-flex justify-content-start">
          <div className="px-3 py-2 rounded-4 rounded-start-0 shadow-sm chat-bubble-partner">
            <div className="typing-indicator d-flex align-items-center gap-1 py-1">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* Anchor to scroll to */}
      <div ref={scrollRef} />
    </div>
  );
}
