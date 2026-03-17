import { create } from "zustand";

type UiStore = {
  activeSessionId: string;
  setActiveSessionId: (sessionId: string) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  activeSessionId: "web:default",
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
}));
