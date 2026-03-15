import type { ProxyStats, ProxyConfigData } from "../types/api";

const API_BASE = "http://localhost:8080/admin"; // Default admin port

export const api = {
  async getStats(): Promise<ProxyStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },

  async getConfig(): Promise<ProxyConfigData> {
    const res = await fetch(`${API_BASE}/config`);
    if (!res.ok) throw new Error("Failed to fetch config");
    return res.json();
  },

  async clearCache(): Promise<{ success: boolean; cleared: number }> {
    const res = await fetch(`${API_BASE}/cache`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to clear cache");
    return res.json();
  }
};
