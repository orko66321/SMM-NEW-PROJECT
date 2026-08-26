import axios, { AxiosError } from "axios";
import type { AuthUser } from "@smm/shared";

// The access token lives ONLY in memory (a module-level variable), never in
// localStorage/sessionStorage — that closes off the most common XSS token-
// theft vector (any injected script that can run in the page can read
// localStorage, but cannot read a variable scoped to this module). The
// refresh token never touches JS at all; it's an httpOnly cookie the browser
// attaches automatically and the API sets/rotates.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpired = cb;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api",
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

type RefreshResult = { accessToken: string; user: AuthUser };

async function performRefresh(): Promise<RefreshResult | null> {
  try {
    const res = await axios.post(
      `${apiClient.defaults.baseURL}/auth/refresh`,
      {},
      { withCredentials: true },
    );
    const { accessToken, user } = res.data as RefreshResult;
    setAccessToken(accessToken);
    return { accessToken, user };
  } catch {
    setAccessToken(null);
    return null;
  }
}

let refreshPromise: Promise<RefreshResult | null> | null = null;

// Single-flight, shared by every caller in this tab: the mount-time session
// restore in AuthContext (api/auth.ts's tryRefresh) and this file's own
// 401-triggered retry below both call this instead of hitting POST
// /auth/refresh independently. The refresh token is single-use and rotates
// server-side on every call — two callers racing with the same not-yet-
// rotated cookie used to make the second one look like a stolen-token
// replay to the backend, which revokes *every* session for the account as
// a security response. That's what caused "refreshing the page logs you
// out": AuthContext's own restore call and an interceptor-triggered retry
// (from some other component's request firing before the access token was
// back in memory) would both submit the same cookie value within
// milliseconds of each other. Deduping to one in-flight request removes
// the race entirely for same-tab callers.
export function refreshAuthSession(): Promise<RefreshResult | null> {
  refreshPromise ??= performRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    const isAuthEndpoint = original?.url?.includes("/auth/login") || original?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      const result = await refreshAuthSession();
      if (result) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${result.accessToken}`;
        return apiClient(original);
      }
      onSessionExpired?.();
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}
