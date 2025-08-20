export const API =
    import.meta.env.VITE_API || "http://localhost:5000";
export const SOCKET_URL = API.replace(/\/$/, "");
