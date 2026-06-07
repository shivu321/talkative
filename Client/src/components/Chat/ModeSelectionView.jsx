// src/components/chat/ModeSelectionView.jsx
import React, { useState } from "react";

export default function ModeSelectionView({
  banner,
  onModeSelect,
  totalOnline,
  onConnectWithFriend,
  friendRequests = { sent: [], received: [], friends: [] },
  onAcceptRequest,
  onDeclineRequest,
  onSendRequestDirectly,
  onSetFriendAlias,
  mySessionId,
  outgoingChatRequest,
  onDismissOutgoingRequest
}) {
  const [editingFriend, setEditingFriend] = useState(null);
  const [aliasInput, setAliasInput] = useState("");
  const [friendInput, setFriendInput] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState("received"); // "received" or "sent"
  const [addFriendInput, setAddFriendInput] = useState("");
  const [addFriendError, setAddFriendError] = useState("");

  const handleConnect = (e) => {
    e.preventDefault();
    if (!friendInput.trim()) return;
    onConnectWithFriend(friendInput.trim());
  };

  const handleSendRequest = (e) => {
    e.preventDefault();
    if (!addFriendInput.trim()) return;
    onSendRequestDirectly(addFriendInput.trim());
    setAddFriendInput("");
  };

  return (
    <div className="d-flex align-items-center justify-content-center flex-grow-1 py-4 position-relative">
      
      {/* Notifications Hub Trigger Button */}
      <div className="position-absolute top-0 start-0 m-3" style={{ zIndex: 10 }}>
        <button
          className="btn btn-outline-light rounded-circle border-0 d-flex align-items-center justify-content-center position-relative shadow-sm"
          onClick={() => setShowNotifications(!showNotifications)}
          style={{ width: "42px", height: "42px", color: "var(--text-main)", background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
          type="button"
          title="Friend Requests & Notifications"
        >
          <i className="bi bi-bell-fill"></i>
          {friendRequests.received?.length > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger animate-pulse" style={{ fontSize: "10px", transform: "translate(-30%, -30%)" }}>
              {friendRequests.received.length}
            </span>
          )}
        </button>
      </div>

      <div className="d-flex flex-column align-items-center w-100" style={{ maxWidth: "1000px" }}>
        
        {/* Banner Alert if present */}
        {banner && (
          <div className="alert alert-info border-0 shadow-sm rounded-pill px-4 mb-4 text-center glass-panel" style={{ color: 'var(--text-main)' }}>
            <i className="bi bi-info-circle-fill me-2 text-primary"></i>
            {banner}
          </div>
        )}

        <div className="text-center mb-5 px-3">
          <h2 className="fw-bold mb-2" style={{ letterSpacing: "-0.5px", fontSize: "2.2rem" }}>
            Choose Your Mode
          </h2>
          <p className="text-muted">Select a random match mode or connect directly with a friend</p>
        </div>

        {/* Mode cards container */}
        <div className="row g-4 w-100 px-3 justify-content-center">
          
          {/* Card 1: Text Chat */}
          <div className="col-md-6 col-lg-4">
            <div 
              className="glass-panel mode-card p-4 h-100 d-flex flex-column align-items-center text-center rounded-4"
              onClick={() => onModeSelect("chat")}
            >
              <div 
                className="d-flex align-items-center justify-content-center mb-4 rounded-circle bg-opacity-10"
                style={{ width: "80px", height: "80px", backgroundColor: "rgba(109, 117, 242, 0.12)", border: "1.5px solid rgba(109, 117, 242, 0.3)" }}
              >
                <i className="bi bi-chat-right-text-fill" style={{ fontSize: "2rem", color: "var(--primary-color)" }}></i>
              </div>
              <h3 className="fw-bold mb-2 fs-4">Text Chat</h3>
              <p className="text-muted small flex-grow-1 px-2 mb-4">
                Chat completely anonymously using text. Ideal for casual, fast matchmaking.
              </p>
              <button 
                className="btn btn-glowing-primary w-100 py-3 rounded-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onModeSelect("chat");
                }}
              >
                Start Chatting
              </button>
            </div>
          </div>

          {/* Card 2: Video Chat */}
          <div className="col-md-6 col-lg-4">
            <div 
              className="glass-panel mode-card p-4 h-100 d-flex flex-column align-items-center text-center rounded-4"
              onClick={() => onModeSelect("video")}
            >
              <div 
                className="d-flex align-items-center justify-content-center mb-4 rounded-circle bg-opacity-10"
                style={{ width: "80px", height: "80px", backgroundColor: "rgba(46, 196, 182, 0.12)", border: "1.5px solid rgba(46, 196, 182, 0.3)" }}
              >
                <i className="bi bi-camera-video-fill" style={{ fontSize: "2rem", color: "var(--success-color)" }}></i>
              </div>
              <h3 className="fw-bold mb-2 fs-4">Video Chat</h3>
              <p className="text-muted small flex-grow-1 px-2 mb-4">
                Share your webcam and microphone to chat face-to-face in real-time.
              </p>
              <button 
                className="btn btn-glowing-success w-100 py-3 rounded-pill"
                onClick={(e) => {
                  e.stopPropagation();
                  onModeSelect("video");
                }}
              >
                Start Video Call
              </button>
            </div>
          </div>

          {/* Card 3: Friend Chat (Input-based direct connection) */}
          <div className="col-md-6 col-lg-4">
            <div 
              className="glass-panel p-4 h-100 d-flex flex-column align-items-center text-center rounded-4"
              style={{ border: "1px solid var(--glass-border)", background: "rgba(255, 255, 255, 0.01)" }}
            >
              <div 
                className="d-flex align-items-center justify-content-center mb-4 rounded-circle bg-opacity-10"
                style={{ width: "80px", height: "80px", backgroundColor: "rgba(255, 75, 145, 0.12)", border: "1.5px solid rgba(255, 75, 145, 0.3)" }}
              >
                <i className="bi bi-people-fill" style={{ fontSize: "2rem", color: "var(--accent-color)" }}></i>
              </div>
              <h3 className="fw-bold mb-2 fs-4">Friend Chat</h3>
              <p className="text-muted small flex-grow-1 px-2 mb-3">
                Enter your friend's unique ID handler to start chatting and load your chat history.
              </p>
              
              <form onSubmit={handleConnect} className="w-100">
                <input
                  type="text"
                  className="form-control text-center rounded-pill py-2 px-3 mb-3"
                  style={{ fontSize: "0.85rem", border: "1px solid var(--glass-border)", background: "var(--input-bg)", color: "var(--text-main)" }}
                  placeholder="talkative_xxxxx"
                  value={friendInput}
                  onChange={(e) => setFriendInput(e.target.value)}
                />
                <button 
                  type="submit"
                  className="btn btn-glowing-accent w-100 py-3 rounded-pill"
                  disabled={!friendInput.trim()}
                >
                  Connect Friend
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Online count block */}
        {totalOnline && (
          <div 
            className="glass-panel mt-5 px-4 py-3 text-center d-flex align-items-center justify-content-center gap-2 rounded-pill shadow-sm"
            style={{ minWidth: "280px" }}
          >
            <span className="d-inline-block rounded-circle bg-success anim-pulse" style={{ width: "10px", height: "10px", boxShadow: "0 0 10px #2ec4b6" }}></span>
            <span className="text-muted small fw-semibold tracking-wide">
              {totalOnline}
            </span>
          </div>
        )}

      </div>

      {/* Slide-out Friend Notifications Hub */}
      {showNotifications && (
        <div 
          className="position-fixed top-0 start-0 h-100 glass-panel shadow-lg d-flex flex-column"
          style={{ 
            width: "360px", 
            zIndex: 1000, 
            borderRadius: "0 24px 24px 0", 
            background: "var(--glass-bg)", 
            backdropFilter: "blur(24px)",
            borderLeft: "none",
            animation: "slideIn 0.3s ease-out forwards"
          }}
        >
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-4 border-bottom border-secondary border-opacity-20">
            <h5 className="mb-0 fw-bold" style={{ color: "var(--text-main)" }}>Notifications</h5>
            <button 
              className="btn btn-link p-0 text-muted" 
              onClick={() => setShowNotifications(false)}
              style={{ border: "none", background: "none" }}
            >
              <i className="bi bi-x-lg fs-5"></i>
            </button>
          </div>

          {/* Quick Add Friend Input */}
          <div className="p-3 border-bottom border-secondary border-opacity-20 bg-white bg-opacity-5">
            <form onSubmit={handleSendRequest} className="d-flex gap-2">
              <input
                type="text"
                className="form-control form-control-sm rounded-pill px-3 py-2"
                placeholder="Add friend talkative_..."
                value={addFriendInput}
                onChange={(e) => setAddFriendInput(e.target.value)}
                style={{ fontSize: "0.8rem", color: "var(--text-main)", background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
              />
              <button 
                type="submit" 
                className="btn btn-sm btn-glowing-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: "32px", height: "32px" }}
                disabled={!addFriendInput.trim()}
              >
                <i className="bi bi-plus-lg text-white"></i>
              </button>
            </form>
          </div>

          {/* Tabs */}
          <div className="d-flex p-3 gap-1.5 justify-content-center border-bottom border-secondary border-opacity-10">
            <button 
              className={`btn btn-xs flex-grow-1 rounded-pill py-1.5 ${activeTab === "received" ? "btn-light text-dark border-secondary" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("received")}
              style={{ color: activeTab === "received" ? "" : "var(--text-main)", borderColor: "var(--glass-border)", fontSize: "0.72rem" }}
            >
              Received ({friendRequests.received?.length || 0})
            </button>
            <button 
              className={`btn btn-xs flex-grow-1 rounded-pill py-1.5 ${activeTab === "sent" ? "btn-light text-dark border-secondary" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("sent")}
              style={{ color: activeTab === "sent" ? "" : "var(--text-main)", borderColor: "var(--glass-border)", fontSize: "0.72rem" }}
            >
              Sent ({friendRequests.sent?.length || 0})
            </button>
            <button 
              className={`btn btn-xs flex-grow-1 rounded-pill py-1.5 ${activeTab === "friends" ? "btn-light text-dark border-secondary" : "btn-outline-secondary"}`}
              onClick={() => setActiveTab("friends")}
              style={{ color: activeTab === "friends" ? "" : "var(--text-main)", borderColor: "var(--glass-border)", fontSize: "0.72rem" }}
            >
              Friends ({friendRequests.friends?.length || 0})
            </button>
          </div>

          {/* Request Lists View */}
          <div className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-2">
            {activeTab === "received" ? (
              friendRequests.received && friendRequests.received.length > 0 ? (
                friendRequests.received.map((reqUser) => (
                  <div key={reqUser} className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                    <span className="small text-truncate" style={{ maxWidth: "160px", color: "var(--text-main)" }}>
                      talkative_{reqUser}
                    </span>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-sm btn-success rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: "26px", height: "26px" }}
                        onClick={() => onAcceptRequest(reqUser)}
                        title="Accept Request"
                      >
                        <i className="bi bi-check-lg" style={{ fontSize: "0.85rem" }}></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-danger rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: "26px", height: "26px" }}
                        onClick={() => onDeclineRequest(reqUser)}
                        title="Decline Request"
                      >
                        <i className="bi bi-x-lg" style={{ fontSize: "0.85rem" }}></i>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted small py-5">No received requests.</div>
              )
            ) : activeTab === "sent" ? (
              friendRequests.sent && friendRequests.sent.length > 0 ? (
                friendRequests.sent.map((reqUser) => (
                  <div key={reqUser} className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5">
                    <span className="small text-truncate" style={{ maxWidth: "180px", color: "var(--text-main)" }}>
                      talkative_{reqUser}
                    </span>
                    <button 
                      className="btn btn-sm btn-outline-danger py-1 px-2 rounded-pill"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => onDeclineRequest(reqUser)} // Decline deletes the pending record
                    >
                      Cancel
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted small py-5">No sent requests.</div>
              )
            ) : (
              friendRequests.friends && friendRequests.friends.length > 0 ? (
                friendRequests.friends.map((friendObj) => {
                  const friendHandle = typeof friendObj === "string" ? friendObj : friendObj.handle;
                  const friendAlias = typeof friendObj === "string" ? "" : friendObj.alias;
                  const isEditing = editingFriend === friendHandle;

                  return (
                    <div key={friendHandle} className="d-flex justify-content-between align-items-center p-3 rounded-3 bg-white bg-opacity-5 border border-white border-opacity-5 gap-2">
                      <div className="flex-grow-1 text-start overflow-hidden d-flex flex-column justify-content-center">
                        {isEditing ? (
                          <div className="d-flex align-items-center gap-2 w-100">
                            <input
                              type="text"
                              className="form-control form-control-sm rounded-pill px-3 py-1 flex-grow-1"
                              value={aliasInput}
                              onChange={(e) => setAliasInput(e.target.value)}
                              placeholder="Nickname / Alias"
                              style={{ fontSize: "0.8rem", color: "var(--text-main)", background: "var(--input-bg)", border: "1px solid var(--glass-border)" }}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  onSetFriendAlias(friendHandle, aliasInput);
                                  setEditingFriend(null);
                                } else if (e.key === "Escape") {
                                  setEditingFriend(null);
                                }
                              }}
                            />
                            <button
                              className="btn btn-sm btn-success rounded-circle p-1 d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: "26px", height: "26px" }}
                              onClick={() => {
                                onSetFriendAlias(friendHandle, aliasInput);
                                setEditingFriend(null);
                              }}
                              type="button"
                              title="Save Alias"
                            >
                              <i className="bi bi-check-lg" style={{ fontSize: "0.8rem" }}></i>
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary rounded-circle p-1 d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: "26px", height: "26px", color: "var(--text-main)", borderColor: "var(--glass-border)" }}
                              onClick={() => setEditingFriend(null)}
                              type="button"
                              title="Cancel"
                            >
                              <i className="bi bi-x-lg" style={{ fontSize: "0.8rem" }}></i>
                            </button>
                          </div>
                        ) : (
                          <div className="d-flex align-items-center flex-wrap">
                            <span className="small fw-semibold text-truncate" style={{ maxWidth: "150px", color: "var(--text-main)" }} title={friendAlias || `talkative_${friendHandle}`}>
                              {friendAlias || `talkative_${friendHandle}`}
                            </span>
                            {friendAlias && (
                              <span className="small text-muted ms-1 text-truncate" style={{ fontSize: "0.72rem", maxWidth: "90px" }}>
                                (talkative_{friendHandle})
                              </span>
                            )}
                            <button
                              className="btn btn-link p-0 ms-2 hover-scale border-0 bg-transparent"
                              onClick={() => {
                                setEditingFriend(friendHandle);
                                setAliasInput(friendAlias || "");
                              }}
                              type="button"
                              title="Edit Nickname"
                            >
                              <i className="bi bi-pencil-fill text-muted" style={{ fontSize: "0.75rem" }}></i>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {!isEditing && (() => {
                        const isPendingThis = outgoingChatRequest?.status === "pending" && outgoingChatRequest?.toHandle === friendHandle;
                        const isCooldownThis = outgoingChatRequest?.status === "cooldown";
                        return (
                          <button
                            className={`btn btn-sm ${isPendingThis ? "btn-outline-secondary" : "btn-glowing-accent"} py-1.5 px-3 rounded-pill flex-shrink-0`}
                            style={{ fontSize: "0.75rem" }}
                            disabled={isPendingThis || isCooldownThis}
                            onClick={() => {
                              setShowNotifications(false);
                              onConnectWithFriend(friendHandle);
                            }}
                            type="button"
                          >
                            {isPendingThis ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-1" style={{ width: "10px", height: "10px" }}></span>
                                Waiting…
                              </>
                            ) : (
                              <>
                                <i className="bi bi-chat-fill me-1"></i>
                                Chat
                              </>
                            )}
                          </button>
                        );
                      })()}
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted small py-5">No friends added yet.</div>
              )
            )}
          </div>
        </div>
      )}

      {/* Slide-out animation styles */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>

    </div>
  );
}
