// src/components/chat/ChatView.jsx
import React from "react";
import { Helmet } from "react-helmet";
import VideoChatUI from "./VideoChatUI";
import TextChatUI from "./TextChatUI";

export default function ChatView(props) {
  const { mode, banner, handleNext, nextBusyRef } = props;

  return (
    <div className="d-flex flex-column flex-grow-1 py-3 px-2">
      <Helmet>
        <title>Anonymous Chat with Strangers - Omegle Alternative</title>
        <meta
          name="description"
          content="Start a free and anonymous video or text chat with random strangers instantly."
        />
        <meta
          name="keywords"
          content="omegle, anonymous chat, video chat, random chat, chat with strangers, free chat"
        />
        <link rel="canonical" href={window.location.href} />
      </Helmet>
      
      <div className="row flex-grow-1 g-4 justify-content-center">
        {/* Main Chat Area */}
        <div className="col-12 col-lg-8 d-flex flex-column">
          <div className="glass-panel p-3 p-md-4 d-flex flex-column h-100 shadow-lg" style={{ minHeight: '500px' }}>
            
            {/* Header Control */}
            <header className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-20">
              <div className="d-flex align-items-center gap-2">
                <span className="d-inline-block rounded-circle bg-danger animate-pulse-glow" style={{ width: '10px', height: '10px' }}></span>
                <h4 className="mb-0 fw-bold fs-5 tracking-tight text-white">
                  Strangers: Anonymous {mode === "video" ? "Video Call" : "Chat Area"}
                </h4>
              </div>
              
              <button
                className="btn btn-glowing-accent px-4 py-2 rounded-pill d-flex align-items-center gap-2 fw-semibold"
                onClick={handleNext}
                disabled={nextBusyRef}
                style={{ fontSize: "0.9rem" }}
              >
                {nextBusyRef ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Matching...
                  </>
                ) : (
                  <>
                    <i className="bi bi-arrow-right-circle-fill"></i>
                    Next Match
                  </>
                )}
              </button>
            </header>

            {/* Status Info Banner */}
            {banner && (
              <div className="alert alert-warning border-0 rounded-3 py-2 px-3 mb-3 small d-flex align-items-center gap-2 bg-opacity-10 bg-warning text-warning shadow-sm">
                <i className="bi bi-info-circle-fill fs-6"></i>
                <span>{banner}</span>
              </div>
            )}

            {/* Embeddable Chat Body */}
            <main className="flex-grow-1" style={{ position: "relative", minHeight: 0 }}>
              {mode === "video" ? (
                <VideoChatUI
                  localStream={props.localStream}
                  remoteStream={props.remoteStream}
                  videoError={props.videoError}
                  partnerPresent={props.partnerPresent}
                />
              ) : (
                <TextChatUI {...props} />
              )}
            </main>

          </div>
        </div>

        {/* Desktop Sidebar Panel */}
        <div className="col-12 col-lg-4 d-none d-lg-flex">
          <div className="glass-panel p-4 w-100 d-flex flex-column shadow-lg">
            <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom border-secondary border-opacity-20">
              <div className="d-inline-flex align-items-center justify-content-center rounded-3 bg-white bg-opacity-5 border border-white border-opacity-10" style={{ width: '48px', height: '48px' }}>
                <i className="bi bi-shield-lock-fill text-accent" style={{ fontSize: '1.4rem', color: 'var(--accent-color)' }}></i>
              </div>
              <div>
                <h5 className="mb-0 fw-bold text-white">Safety center</h5>
                <p className="text-muted small mb-0">Protecting your digital identity</p>
              </div>
            </div>

            <div className="flex-grow-1 d-flex flex-column gap-3 text-start">
              
              <div className="p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                <h6 className="fw-bold text-white mb-2">
                  <i className="bi bi-eye-slash-fill me-2 text-primary"></i>
                  Strict Privacy
                </h6>
                <p className="text-muted small mb-0">
                  Your chat logs and video streams are peer-to-peer. Nothing is recorded or stored on our servers.
                </p>
              </div>

              <div className="p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                <h6 className="fw-bold text-white mb-2">
                  <i className="bi bi-ban me-2 text-danger"></i>
                  Zero Spam Rules
                </h6>
                <p className="text-muted small mb-0">
                  Sharing links, phone numbers, email addresses, or social handles will trigger automated system blocks.
                </p>
              </div>

              <div className="p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                <h6 className="fw-bold text-white mb-2">
                  <i className="bi bi-arrow-left-right me-2 text-success"></i>
                  Quick Disconnect
                </h6>
                <p className="text-muted small mb-0">
                  Not feeling the vibe? Simply click the **Next Match** button to instantly move on to another active user.
                </p>
              </div>

            </div>

            <div className="mt-auto pt-3 border-top border-secondary border-opacity-20 text-center text-muted small">
              <p className="mb-0">Talkative Matchmaking © 2026</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 4px #dc3545; opacity: 0.6; }
          50% { box-shadow: 0 0 12px #dc3545; opacity: 1; }
        }
        .animate-pulse-glow {
          animation: pulseGlow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
