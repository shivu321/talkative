export const API =
    import.meta.env.VITE_API || "https://api.talkative.co.in";
export const SOCKET_URL = API.replace(/\/$/, "");
