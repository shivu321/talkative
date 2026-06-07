/**
 * pages/admin/AdminDashboard.jsx
 *
 * Premium dashboard containing counts, searchable tables of sessions & messages,
 * and integration with the chat history side panel.
 */
import React, { useState, useEffect } from "react";
import { adminApi } from "../../utils/adminApi";
import SessionChatHistory from "../../components/admin/SessionChatHistory";

export default function AdminDashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState("sessions");
  const [stats, setStats] = useState({ totalSessions: 0, totalMessages: 0, onlineCount: 0 });
  
  // Table state
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(15);
  
  // Selected session for chat history sidebar
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  
  // Selected coordinates for OpenStreetMap modal
  const [mapCoordinates, setMapCoordinates] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState("video");

  // Load stats
  const fetchStats = () => {
    adminApi.getStats()
      .then((res) => {
        if (res.success) setStats(res.stats);
      })
      .catch((err) => console.error("Stats error:", err));
  };

  // Load telemetry table data
  const fetchData = () => {
    setLoading(true);
    if (activeTab === "sessions") {
      adminApi.getSessions(page, limit, search)
        .then((res) => {
          setSessions(res.data || []);
          setTotalPages(res.pagination?.pages || 1);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    } else {
      adminApi.getMessages(page, limit, search)
        .then((res) => {
          setMessages(res.data || []);
          setTotalPages(res.pagination?.pages || 1);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll stats every 10 seconds for real-time counts
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeTab, page, search]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setPage(1);
    setSearch("");
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="container py-5 px-3 px-md-4" style={{ minHeight: "100vh", color: "var(--text-main)" }}>
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-5">
        <div>
          <h1 className="fw-bold tracking-tight mb-1" style={{ fontSize: "2.2rem", color: "var(--text-main)" }}>
            Control Panel
          </h1>
          <p className="text-muted mb-0 small">
            Monitor anonymous sessions, active telemetry, and messaging logs.
          </p>
        </div>
        <button
          onClick={onLogout}
          className="btn btn-outline-danger btn-sm px-4 py-2 rounded-pill"
          style={{ borderColor: "rgba(220, 53, 69, 0.4)", fontSize: "0.85rem", fontWeight: "600" }}
        >
          Sign Out
        </button>
      </div>

      {/* Stats row */}
      <div className="row g-4 mb-5">
        <div className="col-12 col-md-4">
          <div className="glass-panel p-4 d-flex align-items-center gap-4">
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                background: "rgba(109, 117, 242, 0.1)",
                border: "1px solid rgba(109, 117, 242, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" fill="none" stroke="var(--primary-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <span className="text-muted small fw-semibold uppercase tracking-wider block mb-1">Total Consent Sessions</span>
              <h3 className="fw-bold mb-0">{stats.totalSessions}</h3>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-panel p-4 d-flex align-items-center gap-4">
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                background: "rgba(255, 75, 145, 0.1)",
                border: "1px solid rgba(255, 75, 145, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="24" height="24" fill="none" stroke="var(--accent-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-muted small fw-semibold uppercase tracking-wider block mb-1">Total Exchanged Messages</span>
              <h3 className="fw-bold mb-0">{stats.totalMessages}</h3>
            </div>
          </div>
        </div>

        <div className="col-12 col-md-4">
          <div className="glass-panel p-4 d-flex align-items-center gap-4">
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "12px",
                background: "rgba(46, 196, 182, 0.1)",
                border: "1px solid rgba(46, 196, 182, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span className="position-relative d-inline-flex">
                <svg width="24" height="24" fill="none" stroke="var(--success-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
                <span className="position-absolute top-0 start-100 translate-middle p-1 bg-success border border-light rounded-circle">
                  <span className="visually-hidden">Online</span>
                </span>
              </span>
            </div>
            <div>
              <span className="text-muted small fw-semibold uppercase tracking-wider block mb-1">Users Online Now</span>
              <h3 className="fw-bold mb-0" style={{ color: "var(--success-color)" }}>{stats.onlineCount}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className="glass-panel p-4 mb-4">
        {/* Navigation Tabs and Search */}
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3 mb-4">
          <div className="d-flex gap-2" style={{ background: "rgba(0, 0, 0, 0.15)", padding: "0.25rem", borderRadius: "10px", width: "fit-content" }}>
            <button
              onClick={() => handleTabChange("sessions")}
              className="btn btn-sm px-4 py-2"
              style={{
                borderRadius: "8px",
                border: "none",
                background: activeTab === "sessions" ? "var(--primary-color)" : "transparent",
                color: activeTab === "sessions" ? "#fff" : "var(--text-muted)",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              Sessions
            </button>
            <button
              onClick={() => handleTabChange("messages")}
              className="btn btn-sm px-4 py-2"
              style={{
                borderRadius: "8px",
                border: "none",
                background: activeTab === "messages" ? "var(--primary-color)" : "transparent",
                color: activeTab === "messages" ? "#fff" : "var(--text-muted)",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
            >
              Messages
            </button>
          </div>

          <div style={{ position: "relative", minWidth: "280px" }}>
            <input
              type="text"
              className="form-control"
              placeholder={activeTab === "sessions" ? "Search handle, session ID, IP..." : "Search sender, receiver, text..."}
              value={search}
              onChange={handleSearchChange}
              style={{
                background: "var(--input-bg)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-main)",
                borderRadius: "30px",
                padding: "0.6rem 1.2rem",
                paddingRight: "2.5rem",
                fontSize: "0.9rem",
              }}
            />
            <span style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", opacity: 0.6 }}>
              🔍
            </span>
          </div>
        </div>

        {/* Tables */}
        <div className="table-responsive" style={{ maxHeight: "600px" }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted small mt-2">Fetching records...</p>
            </div>
          ) : activeTab === "sessions" ? (
            <table className="table table-hover align-middle mb-0" style={{ color: "var(--text-main)" }}>
              <thead>
                <tr style={{ borderColor: "var(--glass-border)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <th>Session ID</th>
                  <th>Resolved Handle</th>
                  <th>Gender</th>
                  <th>IP Address</th>
                  <th>Location (Lat, Lng)</th>
                  <th>Policies</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.9rem" }}>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4 small">No sessions found.</td>
                  </tr>
                ) : (
                  sessions.map((ses) => (
                    <tr key={ses._id} style={{ borderColor: "var(--glass-border)" }}>
                      <td>
                        <button
                          className="btn btn-link p-0 text-start text-decoration-none font-monospace small"
                          onClick={() => setSelectedSessionId(ses.sessionId)}
                          style={{ color: "var(--primary-color)", fontWeight: "600" }}
                        >
                          {ses.sessionId}
                        </button>
                      </td>
                      <td className="font-monospace small text-accent">talkative_{ses.handle || "N/A"}</td>
                      <td>
                        <span
                          className="badge rounded-pill"
                          style={{
                            background: ses.gender === "male" ? "rgba(109, 117, 242, 0.15)" : ses.gender === "female" ? "rgba(255, 75, 145, 0.15)" : "rgba(255, 255, 255, 0.08)",
                            color: ses.gender === "male" ? "var(--primary-color)" : ses.gender === "female" ? "var(--accent-color)" : "var(--text-main)",
                            border: `1px solid ${ses.gender === "male" ? "rgba(109, 117, 242, 0.3)" : ses.gender === "female" ? "rgba(255, 75, 145, 0.3)" : "var(--glass-border)"}`,
                          }}
                        >
                          {ses.gender}
                        </span>
                      </td>
                      <td className="font-monospace text-muted small">{ses.ip || "N/A"}</td>
                      <td className="font-monospace text-muted small">
                        {ses.latitude !== undefined && ses.longitude !== undefined ? (
                          <button
                            className="btn btn-link p-0 text-start text-decoration-none small d-flex align-items-center gap-1 font-monospace"
                            onClick={() => {
                              setMapCoordinates({ lat: ses.latitude, lng: ses.longitude, handle: ses.handle });
                              setLoadingHistory(true);
                              adminApi.getSessionLocationHistory(ses.sessionId)
                                .then((res) => {
                                  setLocationHistory(res.history || []);
                                  setLoadingHistory(false);
                                })
                                .catch((err) => {
                                  console.error("Location history error:", err);
                                  setLocationHistory([]);
                                  setLoadingHistory(false);
                                });
                            }}
                            style={{ color: "var(--primary-color)", fontWeight: "600", border: "none", background: "none" }}
                            title="Click to view on Map"
                            type="button"
                          >
                            📍 {ses.latitude.toFixed(4)}, {ses.longitude.toFixed(4)}
                          </button>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="small text-muted">
                        {ses.acceptedTerms ? "✓ Terms" : "✗ Terms"} • {ses.acceptedPrivacyPolicy ? "✓ Policy" : "✗ Policy"}
                      </td>
                      <td className="text-muted small">
                        {new Date(ses.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="table table-hover align-middle mb-0" style={{ color: "var(--text-main)" }}>
              <thead>
                <tr style={{ borderColor: "var(--glass-border)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Message Body</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: "0.9rem" }}>
                {messages.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center text-muted py-4 small">No message logs found.</td>
                  </tr>
                ) : (
                  messages.map((msg) => (
                    <tr key={msg._id} style={{ borderColor: "var(--glass-border)" }}>
                      <td className="font-monospace small text-primary">talkative_{msg.senderId}</td>
                      <td className="font-monospace small text-accent">talkative_{msg.receiverId}</td>
                      <td style={{ maxWidth: "320px", wordBreak: "break-all" }}>{msg.text}</td>
                      <td className="text-muted small">
                        {new Date(msg.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-4 pt-3" style={{ borderTop: "1px solid var(--glass-border)" }}>
            <span className="text-muted small">
              Page {page} of {totalPages}
            </span>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary px-3"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{ borderColor: "var(--glass-border)", color: "var(--text-main)" }}
              >
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary px-3"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{ borderColor: "var(--glass-border)", color: "var(--text-main)" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History Slide-out Drawer */}
      <SessionChatHistory
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />

      {/* Map Modal Overlay */}
      {mapCoordinates && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1070,
          }}
        >
          <div
            className="glass-panel glass-panel-glow"
            style={{
              width: "100%",
              maxWidth: "960px",
              padding: "2rem",
              margin: "1rem",
              display: "flex",
              flexDirection: "column",
              color: "var(--text-main)",
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">Interactive Connection History Map</h5>
              <button
                className="btn-close btn-close-white"
                onClick={() => {
                  setMapCoordinates(null);
                  setLocationHistory([]);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "var(--text-main)",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>
            
            <p className="text-muted small mb-3">
              Session User: <code style={{ color: "var(--accent-color)" }}>talkative_{mapCoordinates.handle}</code>
              <br />
              Viewing Location: <code>{mapCoordinates.lat.toFixed(6)}, {mapCoordinates.lng.toFixed(6)}</code>
            </p>

            <div className="row g-4">
              {/* Left Column: Map */}
              <div className="col-12 col-md-7">
                <div
                  style={{
                    width: "100%",
                    height: "380px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid var(--glass-border)",
                    background: "#000",
                  }}
                >
                  <iframe
                    title="User Location Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoordinates.lng - 0.015}%2C${mapCoordinates.lat - 0.015}%2C${mapCoordinates.lng + 0.015}%2C${mapCoordinates.lat + 0.015}&layer=mapnik&marker=${mapCoordinates.lat}%2C${mapCoordinates.lng}`}
                    style={{ border: 0 }}
                  />
                </div>
              </div>

              {/* Right Column: Timeline tabs & lists */}
              <div className="col-12 col-md-5 d-flex flex-column" style={{ minHeight: "380px" }}>
                {/* Tabs */}
                <div className="d-flex gap-2 mb-3" style={{ background: "rgba(0, 0, 0, 0.15)", padding: "0.25rem", borderRadius: "10px", width: "fit-content" }}>
                  <button
                    onClick={() => setActiveHistoryTab("video")}
                    className="btn btn-sm px-3 py-1.5"
                    style={{
                      borderRadius: "8px",
                      border: "none",
                      background: activeHistoryTab === "video" ? "var(--primary-color)" : "transparent",
                      color: activeHistoryTab === "video" ? "#fff" : "var(--text-muted)",
                      fontWeight: "600",
                      fontSize: "0.8rem",
                      transition: "all 0.2s",
                    }}
                  >
                    🎥 Video Calls
                  </button>
                  <button
                    onClick={() => setActiveHistoryTab("chat")}
                    className="btn btn-sm px-3 py-1.5"
                    style={{
                      borderRadius: "8px",
                      border: "none",
                      background: activeHistoryTab === "chat" ? "var(--primary-color)" : "transparent",
                      color: activeHistoryTab === "chat" ? "#fff" : "var(--text-muted)",
                      fontWeight: "600",
                      fontSize: "0.8rem",
                      transition: "all 0.2s",
                    }}
                  >
                    💬 Chat Logs
                  </button>
                </div>

                {/* History List container */}
                <div
                  className="flex-grow-1"
                  style={{
                    maxHeight: "320px",
                    overflowY: "auto",
                    paddingRight: "5px",
                  }}
                >
                  {loadingHistory ? (
                    <div className="text-center py-5">
                      <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      <p className="text-muted small mt-2">Loading connection history...</p>
                    </div>
                  ) : (
                    (() => {
                      const filtered = locationHistory.filter(item => item.mode === activeHistoryTab);
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center text-muted py-5 small">
                            No {activeHistoryTab === "video" ? "video call" : "text chat"} connection history found.
                          </div>
                        );
                      }
                      return (
                        <div className="d-flex flex-column gap-2">
                          {filtered.map((item, idx) => {
                            const isCurrent = mapCoordinates.lat === item.latitude && mapCoordinates.lng === item.longitude;
                            return (
                              <div
                                key={item._id || idx}
                                onClick={() => setMapCoordinates({ lat: item.latitude, lng: item.longitude, handle: mapCoordinates.handle })}
                                style={{
                                  padding: "0.75rem 1rem",
                                  borderRadius: "10px",
                                  border: "1px solid var(--glass-border)",
                                  background: isCurrent ? "rgba(109, 117, 242, 0.15)" : "var(--glass-bg)",
                                  borderColor: isCurrent ? "var(--primary-color)" : "var(--glass-border)",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                className="history-item-hover"
                              >
                                <div className="d-flex justify-content-between mb-1">
                                  <span className="fw-semibold small" style={{ color: isCurrent ? "var(--primary-color)" : "var(--text-main)" }}>
                                    📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                                  </span>
                                  <span className="text-muted" style={{ fontSize: "0.7rem" }}>
                                    {new Date(item.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                  </span>
                                </div>
                                <div className="d-flex justify-content-between small text-muted" style={{ fontSize: "0.75rem" }}>
                                  <span>IP: {item.ip || "Unknown"}</span>
                                  {isCurrent && <span className="badge bg-primary text-white" style={{ fontSize: "0.6rem" }}>Active</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end mt-4">
              <button
                className="btn btn-outline-secondary px-4 py-2 rounded-pill"
                onClick={() => {
                  setMapCoordinates(null);
                  setLocationHistory([]);
                }}
                style={{ borderColor: "var(--glass-border)", color: "var(--text-main)" }}
              >
                Close Map
              </button>
            </div>
          </div>
          <style>{`
            .history-item-hover:hover {
              background: rgba(255, 255, 255, 0.05) !important;
              transform: translateY(-1px);
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
