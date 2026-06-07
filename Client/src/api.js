const defaultApi = typeof window !== "undefined"
  ? `http://${window.location.hostname}:5000`
  : "http://localhost:5000";

export const API =
  import.meta.env.VITE_API && !import.meta.env.VITE_API.includes("localhost")
    ? import.meta.env.VITE_API
    : defaultApi;

export const SOCKET_URL = API.replace(/\/$/, "");
