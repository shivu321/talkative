/**
 * components/Chat/ChatRequestPopups.jsx
 *
 * Renders two overlays related to the friend chat-request confirmation flow:
 *
 *  1. IncomingChatRequestModal  — full-screen blur overlay asking Allow / Decline
 *  2. OutgoingChatRequestToast  — bottom-right toast showing pending / declined / cooldown
 *
 * Props:
 *  incomingChatRequest  { fromHandle }|null
 *  outgoingChatRequest  { toHandle, status, message?, remaining? }|null
 *  onRespond(fromHandle, accepted)  — called when the target user responds
 *  onDismissOutgoing()              — called to close the outgoing toast
 */
import React from "react";

// ─── Incoming request modal ───────────────────────────────────────────────────

function IncomingChatRequestModal({ request, onRespond, displayName }) {
  if (!request) return null;

  // When an alias exists it becomes the headline; the handle is shown as subtitle.
  const hasAlias = displayName && !displayName.startsWith("talkative_");
  const headline = hasAlias ? displayName : `talkative_${request.fromHandle}`;
  const subtitle = hasAlias ? `talkative_${request.fromHandle}` : null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 2000, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="glass-panel p-4 rounded-4 shadow-lg text-center"
        style={{
          maxWidth: "380px",
          width: "90%",
          border: "1px solid rgba(255,255,255,0.12)",
          animation: "slideUpFade 0.3s ease-out",
        }}
      >
        {/* Icon */}
        <div
          className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle"
          style={{
            width: "72px",
            height: "72px",
            background: "rgba(109, 117, 242, 0.12)",
            border: "1.5px solid rgba(109,117,242,0.3)",
          }}
        >
          <i className="bi bi-chat-dots-fill" style={{ fontSize: "2rem", color: "var(--primary-color)" }} />
        </div>

        <h5 className="fw-bold mb-1" style={{ color: "var(--text-main)" }}>Chat Request</h5>
        <p className="mb-1">
          <strong style={{ color: "var(--primary-color)", fontSize: "1rem" }}>
            {headline}
          </strong>
        </p>
        {subtitle && (
          <p className="text-muted mb-1" style={{ fontSize: "0.78rem" }}>
            {subtitle}
          </p>
        )}
        <p className="text-muted small mb-4">wants to start a chat with you.</p>

        {/* Actions */}
        <div className="d-flex gap-3 justify-content-center">
          <button
            id="chat-request-allow-btn"
            className="btn btn-glowing-primary px-4 py-2 rounded-pill fw-semibold"
            onClick={() => onRespond(request.fromHandle, true)}
            type="button"
          >
            <i className="bi bi-check-lg me-1" />
            Allow
          </button>
          <button
            id="chat-request-decline-btn"
            className="btn btn-outline-danger px-4 py-2 rounded-pill fw-semibold"
            style={{ borderColor: "rgba(220,53,69,0.4)", color: "var(--text-main)" }}
            onClick={() => onRespond(request.fromHandle, false)}
            type="button"
          >
            <i className="bi bi-x-lg me-1" />
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Outgoing request toast ───────────────────────────────────────────────────

/** Map a request status to the correct icon element. */
function StatusIcon({ status }) {
  if (status === "pending") {
    return <div className="spinner-border spinner-border-sm text-primary" role="status" />;
  }
  if (status === "declined") {
    return <i className="bi bi-x-circle-fill text-danger fs-5" />;
  }
  if (status === "cooldown") {
    return <i className="bi bi-clock-fill text-warning fs-5" />;
  }
  return null;
}

/** Map a request status to its heading text. */
function statusHeading(status) {
  if (status === "pending") return "Waiting for response…";
  if (status === "declined") return "Request Declined";
  if (status === "cooldown") return "Cooldown Active";
  return "";
}

function OutgoingChatRequestToast({ request, onDismiss }) {
  if (!request) return null;

  const isError = request.status === "declined" || request.status === "cooldown";
  const borderColor = isError
    ? "rgba(220,53,69,0.3)"
    : "rgba(109,117,242,0.3)";

  return (
    <div
      className="position-fixed bottom-0 end-0 m-4"
      style={{ zIndex: 1900, maxWidth: "320px", width: "90%" }}
    >
      <div
        className="glass-panel p-3 rounded-4 shadow-lg d-flex align-items-start gap-3"
        style={{ border: `1px solid ${borderColor}`, animation: "slideUpFade 0.3s ease-out" }}
      >
        {/* Status icon */}
        <div className="flex-shrink-0 mt-1">
          <StatusIcon status={request.status} />
        </div>

        {/* Text */}
        <div className="flex-grow-1">
          <div className="fw-semibold small mb-1" style={{ color: "var(--text-main)" }}>
            {statusHeading(request.status)}
          </div>
          <div className="text-muted" style={{ fontSize: "0.8rem" }}>
            {request.status === "pending"
              ? `Sent to talkative_${request.toHandle}`
              : request.message}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          className="btn btn-link p-0 ms-1 flex-shrink-0"
          style={{ color: "var(--text-muted)", border: "none", background: "none" }}
          onClick={onDismiss}
          type="button"
          title="Dismiss"
          aria-label="Dismiss notification"
        >
          <i className="bi bi-x-lg" style={{ fontSize: "0.85rem" }} />
        </button>
      </div>
    </div>
  );
}

// ─── Keyframe styles ──────────────────────────────────────────────────────────

const SLIDE_UP_KEYFRAMES = `
  @keyframes slideUpFade {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── Public composite component ───────────────────────────────────────────────

/**
 * Renders both overlays. Safe to always mount — each child guards its own null.
 */
export default function ChatRequestPopups({
  incomingChatRequest,
  incomingDisplayName,
  outgoingChatRequest,
  onRespond,
  onDismissOutgoing,
}) {
  return (
    <>
      <IncomingChatRequestModal
        request={incomingChatRequest}
        onRespond={onRespond}
        displayName={incomingDisplayName}
      />
      <OutgoingChatRequestToast request={outgoingChatRequest} onDismiss={onDismissOutgoing} />
      <style>{SLIDE_UP_KEYFRAMES}</style>
    </>
  );
}
