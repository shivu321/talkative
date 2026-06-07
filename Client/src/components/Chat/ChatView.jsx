// src/components/chat/ChatView.jsx
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import VideoChatUI from "./VideoChatUI";
import TextChatUI from "./TextChatUI";

export default function ChatView(props) {
  const [copied, setCopied] = useState(false);
  const {
    mode,
    banner,
    handleNext,
    handleEnd,
    nextBusyRef,
    theme,
    toggleTheme,
    isFriendChat,
    isFriendOnline,
    isFriendshipAccepted,
    onSendRequestDirectly,
    onAcceptRequest,
    onDeclineRequest,
    partnerId,
    mySessionId,
    partnerPresent,
    partnerGender,
    friendRequests
  } = props;

  const friendObj = friendRequests?.friends?.find(f => (typeof f === 'string' ? f === partnerId : f.handle === partnerId));
  const partnerAlias = friendObj && typeof friendObj !== 'string' ? friendObj.alias : "";
  const partnerHandle = partnerAlias ? `${partnerAlias} (talkative_${partnerId})` : partnerId ? `talkative_${partnerId}` : "Strangers";
  const isFriend = friendRequests?.friends?.some(f => (typeof f === 'string' ? f === partnerId : f.handle === partnerId));
  const friendName = partnerAlias || (isFriend ? `talkative_${partnerId}` : "Stranger");

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
            <header className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-20 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span 
                  className={`d-inline-block rounded-circle animate-pulse-glow ${partnerPresent ? 'bg-success' : 'bg-danger'}`} 
                  style={{ 
                    width: '10px', 
                    height: '10px',
                    boxShadow: partnerPresent ? '0 0 8px #2ec4b6' : '0 0 8px #dc3545'
                  }}
                ></span>
                <h4 className="mb-0 fw-bold fs-5 tracking-tight d-flex align-items-center gap-2" style={{ color: "var(--text-main)" }}>
                  {isFriendChat ? "Friend: " : ""}
                  {partnerHandle}
                  {partnerGender && (
                    <span 
                      className="badge rounded-pill px-2 py-0.5"
                      style={{
                        backgroundColor: 
                          partnerGender === "male"
                            ? "rgba(109, 117, 242, 0.15)"
                            : partnerGender === "female"
                            ? "rgba(255, 75, 145, 0.15)"
                            : "rgba(46, 196, 182, 0.15)",
                        color:
                          partnerGender === "male"
                            ? "var(--primary-color)"
                            : partnerGender === "female"
                            ? "var(--accent-color)"
                            : "var(--success-color)",
                        border: 
                          partnerGender === "male"
                            ? "1px solid rgba(109, 117, 242, 0.3)"
                            : partnerGender === "female"
                            ? "1px solid rgba(255, 75, 145, 0.3)"
                            : "1px solid rgba(46, 196, 182, 0.3)",
                        fontSize: "0.75rem",
                        marginLeft: "5px",
                        fontWeight: "600"
                      }}
                      title={partnerGender.charAt(0).toUpperCase() + partnerGender.slice(1)}
                    >
                      {partnerGender === "male" ? "M" : partnerGender === "female" ? "F" : "O"}
                    </span>
                  )}
                </h4>
                
                {partnerId && (
                  copied ? (
                    <span className="text-success small fw-semibold d-flex align-items-center gap-1 ms-1" style={{ fontSize: "0.8rem" }}>
                      <i className="bi bi-check-lg"></i> Copied
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm btn-link p-1 hover-scale"
                      onClick={() => {
                        navigator.clipboard.writeText(partnerHandle);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      type="button"
                      title="Copy Handle"
                      style={{ border: "none", background: "none" }}
                    >
                      <i className="bi bi-copy text-primary" style={{ fontSize: "0.85rem" }}></i>
                    </button>
                  )
                )}

                {!isFriendChat && partnerId && friendRequests?.friends?.some(f => (typeof f === 'string' ? f === partnerId : f.handle === partnerId)) && (
                  <span 
                    className="badge bg-success rounded-pill px-3 py-1.5 ms-2 fw-semibold d-inline-flex align-items-center gap-1"
                    style={{ fontSize: "0.75rem" }}
                  >
                    <i className="bi bi-people-fill"></i> Friends
                  </span>
                )}
              </div>
              
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-outline-light rounded-circle border-0 d-flex align-items-center justify-content-center shadow-sm"
                  onClick={toggleTheme}
                  style={{ width: "40px", height: "40px", color: "var(--text-main)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
                  type="button"
                  title="Toggle Theme"
                >
                  <i className={theme === "light" ? "bi bi-moon-stars-fill" : "bi bi-sun-fill"}></i>
                </button>

                {isFriendChat ? (
                  <div className="d-flex align-items-center">
                    {isFriendOnline && isFriendshipAccepted && mode !== "video" && (
                      <button
                        className="btn btn-glowing-primary px-4 py-2 rounded-pill d-flex align-items-center gap-2 fw-semibold me-2"
                        onClick={props.onStartFriendVideoChat}
                        style={{ fontSize: "0.9rem" }}
                        type="button"
                      >
                        <i className="bi bi-camera-video-fill"></i>
                        Video Call
                      </button>
                    )}
                    {isFriendOnline && isFriendshipAccepted && mode === "video" && (
                      <button
                        className="btn btn-outline-warning px-4 py-2 rounded-pill d-flex align-items-center gap-2 fw-semibold me-2"
                        onClick={props.onCancelFriendVideoChat}
                        style={{ fontSize: "0.9rem" }}
                        type="button"
                      >
                        <i className="bi bi-telephone-minus-fill"></i>
                        Cancel Video
                      </button>
                    )}
                    <button
                      className="btn btn-outline-danger px-4 py-2 rounded-pill d-flex align-items-center gap-2 fw-semibold"
                      onClick={handleEnd}
                      style={{ fontSize: "0.9rem" }}
                      type="button"
                    >
                      <i className="bi bi-box-arrow-left"></i>
                      Leave Chat
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-glowing-accent px-4 py-2 rounded-pill d-flex align-items-center gap-2 fw-semibold"
                    onClick={handleNext}
                    disabled={nextBusyRef}
                    style={{ fontSize: "0.9rem" }}
                    type="button"
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
                )}
              </div>
            </header>

            {/* Status Info Banner */}
            {banner && (
              <div className="alert alert-warning border-0 rounded-3 py-2 px-3 mb-3 small d-flex align-items-center gap-2 bg-opacity-10 bg-warning text-warning shadow-sm">
                <i className="bi bi-info-circle-fill fs-6"></i>
                <span>{banner}</span>
              </div>
            )}

            {/* Friend Offline Alert */}
            {isFriendChat && isFriendshipAccepted && !isFriendOnline && (
              <div className="alert alert-warning border-0 rounded-3 py-2 px-3 mb-3 small d-flex align-items-center gap-2 bg-opacity-10 bg-warning text-warning shadow-sm">
                <i className="bi bi-exclamation-triangle-fill fs-6"></i>
                <span>Friend is offline. Chat history is visible but messaging is disabled.</span>
              </div>
            )}

            {/* Embeddable Chat Body */}
            <main className="flex-grow-1" style={{ position: "relative", minHeight: 0 }}>
              {isFriendChat && !isFriendshipAccepted && (
                <div 
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3 rounded-3"
                  style={{
                    background: "rgba(10, 10, 15, 0.82)",
                    backdropFilter: "blur(12px)",
                    zIndex: 10,
                    border: "1px solid rgba(255, 255, 255, 0.08)"
                  }}
                >
                  <div className="text-center p-4 rounded-4 glass-panel shadow-2xl w-100" style={{ maxWidth: "380px" }}>
                    <div 
                      className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle bg-opacity-10"
                      style={{ width: "70px", height: "70px", backgroundColor: "rgba(255, 75, 145, 0.12)", border: "1.5px solid rgba(255, 75, 145, 0.3)" }}
                    >
                      <i className="bi bi-person-x-fill" style={{ fontSize: "2rem", color: "var(--accent-color)" }}></i>
                    </div>
                    <h5 className="fw-bold mb-2" style={{ color: "var(--text-main)" }}>Not Friends</h5>
                    <p className="text-muted small mb-4">
                      You are not friends yet. Send a friend request to start chatting.
                    </p>
                    <button 
                      className="btn btn-glowing-accent w-100 py-2.5 rounded-pill fw-semibold"
                      onClick={() => onSendRequestDirectly(partnerId)}
                    >
                      Send Friend Request
                    </button>
                  </div>
                </div>
              )}

              {mode === "video" ? (
                <VideoChatUI
                  localStream={props.localStream}
                  remoteStream={props.remoteStream}
                  videoError={props.videoError}
                  partnerPresent={props.partnerPresent}
                  partnerName={friendName}
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
                <h5 className="mb-0 fw-bold" style={{ color: "var(--text-main)" }}>Safety center</h5>
                <p className="text-muted small mb-0">Protecting your digital identity</p>
              </div>
            </div>

            <div className="flex-grow-1 d-flex flex-column gap-3 text-start">
              
              <div className="p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                <h6 className="fw-bold mb-2" style={{ color: "var(--text-main)" }}>
                  <i className="bi bi-eye-slash-fill me-2 text-primary"></i>
                  Strict Privacy
                </h6>
                <p className="text-muted small mb-0">
                  Your chat logs and video streams are peer-to-peer. Nothing is recorded or stored on our servers.
                </p>
              </div>

              <div className="p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                <h6 className="fw-bold mb-2" style={{ color: "var(--text-main)" }}>
                  <i className="bi bi-ban me-2 text-danger"></i>
                  Zero Spam Rules
                </h6>
                <p className="text-muted small mb-0">
                  Sharing links, phone numbers, email addresses, or social handles will trigger automated system blocks.
                </p>
              </div>

              <div className="p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                <h6 className="fw-bold mb-2" style={{ color: "var(--text-main)" }}>
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
