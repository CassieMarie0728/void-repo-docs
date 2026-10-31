import { useState } from "react";
import axios from "axios";
import { getServerUrl, isNative, validateServerUrl } from "../api";

export function ServerConnection() {
  const [url, setUrl] = useState(getServerUrl);
  const [token, setToken] = useState(() => sessionStorage.getItem("void_server_token") || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function connect() {
    setBusy(true);
    setMessage("");
    try {
      const origin = validateServerUrl(url);
      const response = await axios.get(`${origin || import.meta.env.VITE_API_BASE_URL || ""}/api/ai/status`, {
        timeout: 90000, headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.data?.app !== "VOID Repo Docs") throw new Error("This address did not return a VOID backend.");
      localStorage.setItem("void_server_url", origin);
      sessionStorage.setItem("void_server_token", token);
      setUrl(origin);
      setMessage(`Connected to VOID. Model: ${response.data.model}. Model readiness is checked when you generate.`);
    } catch (error) {
      setMessage(axios.isAxiosError(error) ? error.response?.data?.error || "Connection failed. Check the server address, network, and access token." : (error as Error).message);
    } finally { setBusy(false); }
  }
  return <section className="space-y-3 border-y border-brand-border py-4">
    <h3 className="text-sm text-brand-text">Server Connection</h3>
    <p className="text-xs text-brand-muted leading-relaxed">{isNative ? "Connect this device to your VOID backend over HTTPS." : "Leave blank to use this web app’s server, or connect your own."} Your model endpoint is configured on that server.</p>
    <label className="block text-xs space-y-1">VOID backend URL
      <input aria-label="VOID backend URL" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.example.com" className="w-full rounded border border-brand-border bg-black p-2 text-sm" />
    </label>
    <label className="block text-xs space-y-1">Server access token (optional)
      <input aria-label="Server access token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} className="w-full rounded border border-brand-border bg-black p-2 text-sm" />
    </label>
    <button type="button" disabled={busy} onClick={connect} className="min-h-11 rounded bg-brand-accent px-4 text-sm text-white disabled:opacity-50">{busy ? "Connecting… free hosting may need a minute" : "Save & test connection"}</button>
    <p role="status" className="text-xs leading-relaxed text-brand-text">{message}</p>
  </section>;
}
