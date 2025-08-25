// src/components/chat/ChatView.jsx
import React from 'react';
import { Helmet } from 'react-helmet';
import VideoChatUI from './VideoChatUI';
import TextChatUI from './TextChatUI';

export default function ChatView(props) {
  const { mode, banner, handleNext, handleEnd, nextBusyRef } = props;

  return (
    <div className="d-flex flex-column flex-grow-1 py-3">
      <Helmet>
        <title>Anonymous Chat with Strangers - Omegle Alternative</title>
        <meta name="description" content="Start a free and anonymous video or text chat with random strangers instantly." />
        <meta name="keywords" content="omegle, anonymous chat, video chat, random chat, chat with strangers, free chat" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      <div className="row flex-grow-1 g-3">
        <div className="col-lg-7 d-flex flex-column">
          <header className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
            <h4 className="mb-0">Anonymous {mode === "video" ? "Video" : "Chat"}</h4>
            <div className="btn-group" role="group">
              <button style={{ background: "#6d75f2", color: "white" }} className="btn btn-lg" onClick={handleNext} disabled={nextBusyRef}>
                {nextBusyRef ? "Finding..." : "🏃‍♂️Left"}
              </button>
            </div>
          </header>
          {banner && <div className="alert alert-info py-2 mb-3">{banner}</div>}
          <main className="flex-grow-1" style={{ position: "relative" }}>
            {mode === "video" ? <VideoChatUI {...props} /> : <TextChatUI {...props} />}
          </main>
        </div>
        <div className="col-lg-5 d-none d-lg-flex align-items-center justify-content-center bg-light rounded-3">
          <p className="text-muted">Advertisement</p>
        </div>
      </div>
    </div>
  );
}
