import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthUser, LoginInput, RegisterInput } from "@smm/shared";
import * as authApi from "../api/auth.js";
import { setOnSessionExpired } from "../api/client.js";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  // Reflects a just-saved phone number into the in-memory user object —
  // e.g. after PhoneOnboardingModal's PATCH /users/me succeeds — without a
  // full session refresh. Purely local state; the source of truth is
  // already updated server-side by that point.
  setUserPhone: (phone: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The access token only lives in memory, so on a fresh page load we
    // silently exchange the httpOnly refresh cookie (if any) for a new one.
    authApi
      .tryRefresh()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    return () => setOnSessionExpired(null);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const loggedInUser = await authApi.login(input);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const loggedInUser = await authApi.googleLogin(idToken);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await authApi.register(input);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const setUserPhone = useCallback((phone: string) => {
    setUser((current) => (current ? { ...current, phone } : current));
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, loginWithGoogle, register, logout, setUserPhone }),
    [user, loading, login, loginWithGoogle, register, logout, setUserPhone],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
