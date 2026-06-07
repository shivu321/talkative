/**
 * components/admin/SessionChatHistory.jsx
 *
 * Slide-out / overlay drawer showing all messages exchanged by a session's user.
 */
import React, { useEffect, useState, useRef } from "react";
import { adminApi } from "../../utils/adminApi";

export default function SessionChatHistory({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [handle, setHandle] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    
    setLoading(true);
    setError("");
    
    adminApi.getSessionMessages(sessionId)
      .then((res) => {
        setMessages(res.messages || []);
        setHandle(res.handle || "");
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load chat history");
        setLoading(false);
      });
  }, [sessionId]);

  useEffect(() => {
    // Scroll to bottom when messages finish loading
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (!sessionId) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        maxWidth: "480px",
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px)",
        borderLeft: "1px solid var(--glass-border)",
        boxShadow: "-10px 0 32px rgba(0, 0, 0, 0.4)",
        zIndex: 1060,
        display: "flex",
        flexDirection: "column",
        color: "var(--text-main)",
        transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--glass-border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h5 className="fw-bold mb-1" style={{ fontSize: "1.1rem" }}>
            Chat History
          </h5>
          <p className="text-muted small mb-0" style={{ wordBreak: "break-all" }}>
            Session: <code style={{ color: "var(--primary-color)" }}>{sessionId}</code>
            {handle && (
              <>
                <br />
                Handle: <code style={{ color: "var(--accent-color)" }}>talkative_{handle}</code>
              </>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          className="btn-close btn-close-white"
          aria-label="Close"
          style={{
            background: "none",
            border: "none",
            fontSize: "1.5rem",
            color: "var(--text-main)",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          &times;
        </button>
      </div>

      {/* Message List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border spinner-border-sm text-primary" role="status" />
            <p className="text-muted small mt-2">Loading conversation...</p>
          </div>
        ) : error ? (
          <div className="text-center text-danger py-5 small">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted py-5 small">No messages recorded for this session.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === handle;
            return (
              <div
                key={msg._id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isMe ? "flex-end" : "flex-start",
                  width: "100%",
                }}
              >
                {/* Sender Tag */}
                <span
                  className="text-muted mb-1"
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: "500",
                    marginLeft: isMe ? "0" : "0.5rem",
                    marginRight: isMe ? "0.5rem" : "0",
                  }}
                >
                  {isMe ? "This Session" : `talkative_${msg.senderId}`}
                </span>
                
                {/* Bubble */}
                <div
                  style={{
                    background: isMe
                      ? "linear-gradient(135deg, #6d75f2 0%, #8b5cf6 100%)"
                      : "rgba(255, 255, 255, 0.08)",
                    color: "#fff",
                    borderRadius: isMe ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                    padding: "0.75rem 1rem",
                    maxWidth: "85%",
                    fontSize: "0.9rem",
                    lineHeight: "1.4",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text}
                </div>

                {/* Timestamp */}
                <span
                  className="text-muted mt-1"
                  style={{
                    fontSize: "0.6rem",
                    marginLeft: isMe ? "0" : "0.5rem",
                    marginRight: isMe ? "0.5rem" : "0",
                  }}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid var(--glass-border)",
          background: "rgba(0, 0, 0, 0.15)",
          textAlign: "center",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}
      >
        Total messages in history: {messages.length}
      </div>
    </div>
  );
}
