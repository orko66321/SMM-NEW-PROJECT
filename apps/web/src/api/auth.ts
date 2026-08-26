import type { AuthUser, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput } from "@smm/shared";
import { apiClient, refreshAuthSession, setAccessToken } from "./client.js";

export async function login(input: LoginInput) {
  const res = await apiClient.post("/auth/login", input);
  setAccessToken(res.data.accessToken);
  return res.data.user as AuthUser;
}

/** idToken is the credential Google Identity Services hands back on sign-in — the server verifies it, this never trusts it client-side. */
export async function googleLogin(idToken: string) {
  const res = await apiClient.post("/auth/google", { idToken });
  setAccessToken(res.data.accessToken);
  return res.data.user as AuthUser;
}

export async function register(input: RegisterInput) {
  const res = await apiClient.post("/auth/register", input);
  return res.data.user as AuthUser;
}

export async function fetchMe() {
  const res = await apiClient.get("/auth/me");
  return res.data.user as AuthUser;
}

export async function logout() {
  await apiClient.post("/auth/logout");
  setAccessToken(null);
}

// Routed through the shared single-flight refreshAuthSession() (see
// client.ts) rather than posting to /auth/refresh directly — this call
// happens on every page mount (AuthContext restoring the session), and it
// must share an in-flight request with any 401-triggered retry the axios
// interceptor fires around the same time, or two callers can submit the
// same not-yet-rotated refresh-token cookie and trigger the backend's
// reuse-detection (revokes every session for the account).
export async function tryRefresh() {
  const result = await refreshAuthSession();
  if (!result) throw new Error("No active session");
  return result.user;
}

export async function forgotPassword(input: ForgotPasswordInput) {
  await apiClient.post("/auth/forgot-password", input);
}

export async function resetPassword(input: ResetPasswordInput) {
  await apiClient.post("/auth/reset-password", input);
}
