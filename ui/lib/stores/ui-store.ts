import { create } from "zustand";

type UiStore = {
  activeSessionId: string;
  sidebarCollapsed: boolean;
  setActiveSessionId: (sessionId: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeSessionId: "web:default",
  sidebarCollapsed: false,
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));
