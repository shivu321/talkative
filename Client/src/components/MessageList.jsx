import React from "react";

export default function MessageList({ messages = [], partnerTyping }) {
  return (
    <div
      className="border p-3"
      style={{ height: "60vh", overflowY: "auto", background: "#fafafa" }}
    >
      {messages.map((m, i) =>
        m.sys ? (
          <div key={i} className="text-center text-muted small">
            {m.text}
          </div>
        ) : (
          <div
            key={i}
            className={
              "d-flex mb-2 " +
              (m.from === "me"
                ? "justify-content-end"
                : "justify-content-start")
            }
          >
            <div
              className={
                "p-2 rounded" +
                (m.from === "me" ? " bg-primary text-white" : " bg-white")
              }
            >
              {m.text}
            </div>
          </div>
        )
      )}
      {partnerTyping && (
        <div className="text-muted fst-italic">Stranger is typing...</div>
      )}
    </div>
  );
}
