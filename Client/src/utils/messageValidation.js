/**
 * utils/messageValidation.js
 *
 * Pure validation function for outgoing chat messages.
 *
 * When two users are friends, no restrictions apply.
 * For anonymous chats, we block:
 *   - Usernames / handles (@ or _)
 *   - Numeric digits
 *   - Number words (one–ten)
 *   - URLs and social-media links
 *   - Email addresses
 *   - Phone numbers
 *
 * @param {string} inputVal   The raw input string from the user
 * @param {boolean} isFriend  Whether the current partner is a friend
 * @returns {{ flag: boolean, message: string }}
 */
export function validateChatMessage(inputVal, isFriend) {
  if (isFriend) return { flag: false, message: "" };

  const text = inputVal.trim();

  const rules = [
    {
      test: () => text.includes("@") || text.includes("_"),
      message: "❌ Usernames or handles containing '@' or '_' are not allowed.",
    },
    {
      test: () => /\d/.test(text),
      message: "❌ Numbers are not allowed.",
    },
    {
      test: () => /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(text),
      message: "❌ Numbers in words (One–Ten) are not allowed.",
    },
    {
      test: () =>
        /(https?:\/\/[^\s]+|www\.[^\s]+|facebook\.com|instagram\.com|twitter\.com|x\.com|linkedin\.com|snapchat\.com|t\.co|bit\.ly|youtu\.be|youtube\.com|telegram\.me|wa\.me|whatsapp\.com|discord\.gg)/i.test(
          text
        ),
      message: "❌ Links and social media are not allowed.",
    },
    {
      test: () => /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/i.test(text),
      message: "❌ Email addresses are not allowed.",
    },
    {
      test: () => /\b(?:\+?\d{1,3}[-.\\s]?)?(?:\d[-.\\s]?){8,}\d\b/.test(text),
      message: "❌ Phone numbers are not allowed.",
    },
  ];

  for (const rule of rules) {
    if (rule.test()) return { flag: true, message: rule.message };
  }

  return { flag: false, message: "" };
}
