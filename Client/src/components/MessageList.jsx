// MessageList.jsx
import React, { useEffect, useRef } from 'react';
import "./messages.css";

export default function MessageList({ 
  messages = [], 
  partnerTyping,
  friendRequests,
  partnerId,
  isFriendChat,
  onSendRequestDirectly,
  onAcceptRequest,
  onDeclineRequest
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, partnerTyping, friendRequests]);

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
                : 'chat-bubble-partner rounded-4 rounded-start-0'
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

      {/* Inline Friend Request / Status Action Card */}
      {!isFriendChat && partnerId && (
        <div className="d-flex justify-content-center my-3">
          {friendRequests?.friends?.some(f => (typeof f === 'string' ? f === partnerId : f.handle === partnerId)) ? (
            <div className="glass-panel p-3 rounded-4 text-center text-success small fw-semibold border border-success border-opacity-20 shadow-sm w-100" style={{ maxWidth: '82%', background: 'rgba(46, 196, 182, 0.05)' }}>
              <i className="bi bi-check-circle-fill me-2 text-success"></i>
              You are now friends! You can view each other in the lobby Friends tab.
            </div>
          ) : friendRequests?.received?.includes(partnerId) ? (
            <div className="glass-panel p-3 rounded-4 border border-white border-opacity-10 shadow-lg text-start w-100" style={{ maxWidth: '82%', background: 'var(--glass-bg)', backdropFilter: "blur(12px)" }}>
              <div className="fw-semibold mb-2" style={{ color: "var(--text-main)", fontSize: "0.9rem" }}>
                <i className="bi bi-person-plus-fill me-2 text-primary"></i>
                Wants to be friends:
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-success rounded-pill px-4 py-1.5 fw-semibold"
                  onClick={() => onAcceptRequest(partnerId)}
                  type="button"
                >
                  Accept
                </button>
                <button
                  className="btn btn-sm btn-outline-danger rounded-pill px-4 py-1.5 fw-semibold"
                  style={{ borderColor: "var(--glass-border)", color: "var(--text-main)" }}
                  onClick={() => onDeclineRequest(partnerId)}
                  type="button"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : friendRequests?.sent?.includes(partnerId) ? (
            <div className="glass-panel p-3 rounded-4 text-center text-muted small border border-white border-opacity-5 shadow-sm w-100" style={{ maxWidth: '82%', background: 'rgba(255, 255, 255, 0.02)' }}>
              <i className="bi bi-clock-history me-2 text-primary"></i>
              Friend request sent. Waiting for partner to accept...
            </div>
          ) : (
            <div className="glass-panel p-3 rounded-4 text-center border border-white border-opacity-10 shadow-md w-100" style={{ maxWidth: '82%', background: 'var(--glass-bg)', backdropFilter: "blur(12px)" }}>
              <div className="small text-muted mb-2">Connect to keep in touch with this partner after the chat.</div>
              <button
                className="btn btn-sm btn-glowing-accent py-1.5 px-4 rounded-pill fw-semibold"
                onClick={() => onSendRequestDirectly(partnerId)}
                type="button"
                style={{ fontSize: "0.8rem" }}
              >
                <i className="bi bi-person-plus-fill me-1"></i>
                Send Friend Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Anchor to scroll to */}
      <div ref={scrollRef} />
    </div>
  );
}
