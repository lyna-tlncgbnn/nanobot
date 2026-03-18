import { create } from "zustand";

type UiStore = {
  activeSessionId: string;
  sidebarCollapsed: boolean;
  jobsPanelCollapsed: boolean;
  setActiveSessionId: (sessionId: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setJobsPanelCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  toggleJobsPanelCollapsed: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeSessionId: "web:default",
  sidebarCollapsed: false,
  jobsPanelCollapsed: false,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setJobsPanelCollapsed: (jobsPanelCollapsed) => set({ jobsPanelCollapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleJobsPanelCollapsed: () => set((state) => ({ jobsPanelCollapsed: !state.jobsPanelCollapsed })),
}));
