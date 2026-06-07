/**
 * hooks/useMyHandle.js
 *
 * Computes and stores the SHA-256 handle for the current user's sessionId.
 * Exposes both a React state value (for rendering) and a ref (for use inside
 * socket callbacks where the closure over stale state is a concern).
 *
 * @param {string} sessionId
 * @returns {{ myHandle: string, myHandleRef: React.RefObject<string> }}
 */
import { useEffect, useRef, useState } from "react";
import { computeHandle } from "../utils/handleHash";

export function useMyHandle(sessionId) {
  const [myHandle, setMyHandle] = useState("");
  const myHandleRef = useRef("");

  useEffect(() => {
    if (!sessionId) return;
    computeHandle(sessionId).then((h) => {
      setMyHandle(h);
      myHandleRef.current = h;
    });
  }, [sessionId]);

  return { myHandle, myHandleRef };
}
