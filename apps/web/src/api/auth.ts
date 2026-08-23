import type { AuthUser, LoginInput, RegisterInput } from "@smm/shared";
import { apiClient, setAccessToken } from "./client.js";

export async function login(input: LoginInput) {
  const res = await apiClient.post("/auth/login", input);
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

export async function tryRefresh() {
  const res = await apiClient.post("/auth/refresh");
  setAccessToken(res.data.accessToken);
  return res.data.user as AuthUser;
}
