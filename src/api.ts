import { Capacitor } from "@capacitor/core";
import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");
export const isNative = Capacitor.isNativePlatform();

export function validateServerUrl(value: string) {
  if (!value.trim()) {
    if (isNative && !configuredApiUrl) throw new Error("Enter the HTTPS address of your VOID backend.");
    return "";
  }
  const url = new URL(value.trim());
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname))) {
    throw new Error("Use HTTPS for your server, or HTTP on localhost for development.");
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Use a server origin such as https://docs.example.com, without a path or credentials.");
  }
  return url.origin;
}

export function getServerUrl() {
  return localStorage.getItem("void_server_url") || configuredApiUrl || "";
}

export const apiClient = axios.create({ timeout: 650000 });
apiClient.interceptors.request.use(config => {
  const baseURL = getServerUrl();
  if (isNative && !baseURL) throw new Error("Connect your VOID backend in Setup → Server Connection first.");
  config.baseURL = baseURL || undefined;
  const token = sessionStorage.getItem("void_server_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
