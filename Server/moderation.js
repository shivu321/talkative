import Filter from "bad-words";
const filter = new Filter();

export function isProfane(text) {
    return filter.isProfane(text);
}

export async function handleReport({
    roomId,
    reporterId,
    reason
}) {
    // store report in DB or send to moderation queue
    console.warn("REPORT RECEIVED:", {
        roomId,
        reporterId,
        reason
    });
    // Implement storing/report notification as needed
}
