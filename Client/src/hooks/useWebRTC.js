/**
 * hooks/useWebRTC.js
 *
 * Encapsulates all WebRTC and local-media logic:
 *   - Acquiring the local camera/mic stream
 *   - Creating RTCPeerConnection as caller or receiver
 *   - Cleaning up peer and media tracks
 *
 * Returns stable function references plus reactive stream state
 * that components can bind directly to <video> elements.
 *
 * @param {React.RefObject} socketRef      Socket.IO socket ref
 * @param {React.MutableRefObject} partnerIdRef  Current partner handle (ref to avoid stale closures)
 * @param {function} setPartnerPresent
 * @returns {{
 *   localStream: MediaStream|null,
 *   remoteStream: MediaStream|null,
 *   videoError: string|null,
 *   ensureLocalStream: () => Promise<MediaStream>,
 *   stopLocalStream: () => void,
 *   cleanupPeer: () => void,
 *   createPeerAsCaller: (toPartnerId: string) => Promise<void>,
 *   createPeerAsReceiver: (from: string, remoteSdp: object) => Promise<void>,
 *   peerRef: React.RefObject
 * }}
 */
import { useRef, useState } from "react";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  ...(import.meta.env.VITE_TURN_URL
    ? [
        {
          urls: import.meta.env.VITE_TURN_URL,
          username: import.meta.env.VITE_TURN_USER,
          credential: import.meta.env.VITE_TURN_PASS,
        },
      ]
    : []),
];

const MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 360 },
    frameRate: { ideal: 30, min: 24 },
  },
};

export function useWebRTC(socketRef, partnerIdRef, setPartnerPresent) {
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [videoError, setVideoError] = useState(null);

  // ── Local stream ───────────────────────────────────────────────────────────

  /** Acquire camera + mic if not already held. Returns the stream. */
  async function ensureLocalStream() {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const st = await navigator.mediaDevices.getUserMedia(MEDIA_CONSTRAINTS);
      localStreamRef.current = st;
      setLocalStream(st);
      setVideoError(null);
      return st;
    } catch (e) {
      setVideoError("Unable to access camera/microphone.");
      throw e;
    }
  }

  /** Stop all local tracks and release the stream. */
  function stopLocalStream() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks()?.forEach((t) => t.stop?.());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }

  // ── Peer connection ────────────────────────────────────────────────────────

  /**
   * Close any existing peer and create a fresh RTCPeerConnection
   * with track + ICE handlers wired up.
   */
  function createPeerBase() {
    // Close previous peer cleanly
    if (peerRef.current) {
      try {
        peerRef.current.getReceivers()?.forEach((r) => r.track?.stop?.());
        peerRef.current.close();
      } catch (_) {
        // ignore
      }
      peerRef.current = null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (e) => {
      console.log("ontrack received", e.streams, e.track);
      const remote = e.streams?.[0] || new MediaStream([e.track]);
      remoteStreamRef.current = remote;
      setRemoteStream(remote);
      setPartnerPresent(true);
    };

    pc.onicecandidate = (ev) => {
      const partnerId = partnerIdRef.current;
      if (ev.candidate && socketRef.current && partnerId) {
        socketRef.current.emit("webrtc-ice", {
          to: partnerId,
          candidate: ev.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      if (s === "disconnected" || s === "failed" || s === "closed") {
        setPartnerPresent(false);
        remoteStreamRef.current = null;
        setRemoteStream(null);
      } else if (s === "connected") {
        setPartnerPresent(true);
      }
    };

    peerRef.current = pc;
    return pc;
  }

  /** Create offer as the calling side and emit webrtc-offer. */
  async function createPeerAsCaller(toPartnerId) {
    try {
      const pc = createPeerBase();
      const local = localStreamRef.current || (await ensureLocalStream());
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("webrtc-offer", {
        to: toPartnerId,
        sdp: pc.localDescription,
      });
    } catch (e) {
      console.error("webrtc caller err", e);
      setVideoError("Failed to start call.");
    }
  }

  /** Create answer as the receiving side and emit webrtc-answer. */
  async function createPeerAsReceiver(from, remoteSdp) {
    try {
      const pc = createPeerBase();
      const local = localStreamRef.current || (await ensureLocalStream());
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      await pc.setRemoteDescription(remoteSdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current?.emit("webrtc-answer", {
        to: from,
        sdp: pc.localDescription,
      });
    } catch (e) {
      console.error("webrtc receiver err", e);
      setVideoError("Failed to answer call.");
    }
  }

  /** Tear down the peer connection and reset remote stream state. */
  function cleanupPeer() {
    if (peerRef.current) {
      try {
        peerRef.current.getReceivers()?.forEach((r) => r.track?.stop?.());
        peerRef.current.close();
      } catch (_) {
        // ignore
      }
      peerRef.current = null;
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);
    setPartnerPresent(false);
  }

  return {
    localStream,
    remoteStream,
    videoError,
    peerRef,
    ensureLocalStream,
    stopLocalStream,
    cleanupPeer,
    createPeerAsCaller,
    createPeerAsReceiver,
  };
}
