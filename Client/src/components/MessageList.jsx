// MessageList.jsx
import React, { useEffect, useRef } from 'react';
import "./messages.css"



export default function MessageList({ messages = [], partnerTyping }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping]);

  return (
    <div className="p-2 message-list-container" >
      {messages.map((msg, idx) => (
        <div
          key={msg.messageId || idx}
          className={`d-flex my-2 ${
            msg.sys
              ? 'justify-content-center' // Center system messages
              : msg.from === 'me'
              ? 'justify-content-end'   // Align user's messages to the right
              : 'justify-content-start' // Align partner's messages to the left
          }`}
        >
          <div
            className={`px-3 py-2 rounded-3 shadow-sm ${
              msg.sys
                ? 'bg-secondary bg-opacity-10 text-muted small fst-italic' // Style for system messages
                : msg.from === 'me'
                ? 'bg-primary text-white' // Style for user's messages
                : 'bg-light border'       // Style for partner's messages
            }`}
            style={{ maxWidth: '75%', wordWrap: 'break-word' }}
          >
            {msg.text}
          </div>
        </div>
      ))}
      {partnerTyping && (
        <div className="d-flex my-2 justify-content-start">
          <div className="px-3 py-2 rounded-3 shadow-sm bg-light border">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {/* This empty div acts as an anchor to scroll to */}
      <div ref={scrollRef} />
    </div>
  );
}
