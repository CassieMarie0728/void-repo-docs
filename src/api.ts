import { Capacitor } from "@capacitor/core";
import axios from "axios";

const DEFAULT_NATIVE_API_URL =
  "https://void-repository-documents-320691612506.us-west2.run.app";

const configuredApiUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL:
    configuredApiUrl ||
    (Capacitor.isNativePlatform() ? DEFAULT_NATIVE_API_URL : undefined),
});
