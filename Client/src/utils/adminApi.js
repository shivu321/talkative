/**
 * utils/adminApi.js
 *
 * Client-side api helpers to interact with the admin panel backend endpoints.
 * Handles automatic JWT insertion in headers.
 */
import { SOCKET_URL } from "../api";

const BASE_URL = `${SOCKET_URL}/admin`;

/**
 * Helper to fetch with JSON content type and authorization token
 */
async function apiRequest(path, method = "GET", body = null) {
  const token = localStorage.getItem("adminToken");
  
  const headers = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
}

export const adminApi = {
  /**
   * Request an OTP to be sent to an email
   */
  async sendOtp(email) {
    return apiRequest("/otp/send", "POST", { email });
  },

  /**
   * Verify the OTP to get an OTP verification token
   */
  async verifyOtp(email, otp) {
    return apiRequest("/otp/verify", "POST", { email, otp });
  },

  /**
   * Log in with credentials and the verified OTP token to receive the Admin JWT
   */
  async login(username, password, otpToken) {
    return apiRequest("/login", "POST", { username, password, otpToken });
  },

  /**
   * Fetch admin dashboard counts and telemetry
   */
  async getStats() {
    return apiRequest("/stats", "GET");
  },

  /**
   * Fetch paginated list of sessions
   */
  async getSessions(page = 1, limit = 20, search = "") {
    return apiRequest(`/sessions?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, "GET");
  },

  /**
   * Fetch paginated list of message logs
   */
  async getMessages(page = 1, limit = 20, search = "") {
    return apiRequest(`/messages?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, "GET");
  },

  /**
   * Fetch all messages for a specific session
   */
  async getSessionMessages(sessionId) {
    return apiRequest(`/sessions/${sessionId}/messages`, "GET");
  },

  async getSessionLocationHistory(sessionId) {
    return apiRequest(`/sessions/${sessionId}/location-history`, "GET");
  },
};
