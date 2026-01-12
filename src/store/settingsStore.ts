import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";

type Theme = "light" | "dark" | "system";

interface SettingsState {
  notesFolder: string | null;
  viewMode: "split" | "tabs";
  activeTab: "editor" | "preview";
  theme: Theme;
  isLoading: boolean;
  setNotesFolder: (folder: string) => Promise<void>;
  setViewMode: (mode: "split" | "tabs") => Promise<void>;
  setActiveTab: (tab: "editor" | "preview") => void;
  setTheme: (theme: Theme) => Promise<void>;
  loadSettings: () => Promise<void>;
}

let store: Store | null = null;

const getStore = async () => {
  if (!store) {
    store = await Store.load("settings.json");
  }
  return store;
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.classList.toggle("dark", prefersDark);
  } else {
    root.classList.toggle("dark", theme === "dark");
  }
};

export const useSettingsStore = create<SettingsState>((set) => ({
  notesFolder: null,
  viewMode: "split",
  activeTab: "editor",
  theme: "system",
  isLoading: true,

  setNotesFolder: async (folder: string) => {
    console.log("Saving notes folder:", folder);
    const s = await getStore();
    await s.set("notesFolder", folder);
    await s.save();
    console.log("Notes folder saved successfully");
    set({ notesFolder: folder });
  },

  setViewMode: async (mode: "split" | "tabs") => {
    const s = await getStore();
    await s.set("viewMode", mode);
    await s.save();
    set({ viewMode: mode });
  },

  setActiveTab: (tab: "editor" | "preview") => {
    set({ activeTab: tab });
  },

  setTheme: async (theme: Theme) => {
    const s = await getStore();
    await s.set("theme", theme);
    await s.save();
    applyTheme(theme);
    set({ theme });
  },

  loadSettings: async () => {
    try {
      const s = await getStore();
      const notesFolder = await s.get<string>("notesFolder");
      const viewMode = await s.get<"split" | "tabs">("viewMode");
      const theme = await s.get<Theme>("theme");

      console.log("Loaded settings:", { notesFolder, viewMode, theme });

      const appliedTheme = theme || "system";
      applyTheme(appliedTheme);

      set({
        notesFolder: notesFolder || null,
        viewMode: viewMode || "split",
        theme: appliedTheme,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load settings:", error);
      set({ isLoading: false });
    }
  },
}));
