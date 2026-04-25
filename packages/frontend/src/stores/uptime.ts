import { create } from "zustand";

interface UptimeData {
  uptimeMs: number;
  serverStartTime: number;
}

interface UptimeState {
  uptime: UptimeData | null;
  connected: boolean;
  connect: () => () => void;
}

export const useUptimeStore = create<UptimeState>((set) => ({
  uptime: null,
  connected: false,
  connect: () => {
    const es = new EventSource("http://localhost:3000/sse/uptime");

    es.onopen = () => set({ connected: true });
    es.onmessage = (event) => set({ uptime: JSON.parse(event.data) });
    es.onerror = () => set({ connected: false });

    return () => es.close();
  },
}));
