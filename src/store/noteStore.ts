import { create } from "zustand";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Store } from "@tauri-apps/plugin-store";

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
  isFavorite?: boolean;
}

export interface SearchResult {
  path: string;
  name: string;
  matches: { line: number; text: string }[];
}

export interface Backlink {
  path: string;
  name: string;
  context: string;
}

export interface TagInfo {
  tag: string;
  count: number;
}

interface NoteState {
  files: FileNode[];
  currentNote: string | null;
  content: string;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  favorites: string[];
  recentNotes: string[];
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  backlinks: Backlink[];
  allTags: TagInfo[];
  selectedTag: string | null;
  setFiles: (files: FileNode[]) => void;
  setCurrentNote: (path: string | null) => void;
  setContent: (content: string) => void;
  setIsDirty: (isDirty: boolean) => void;
  setIsSaving: (isSaving: boolean) => void;
  loadNote: (path: string) => Promise<void>;
  saveNote: () => Promise<void>;
  toggleFavorite: (path: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  searchNotes: (query: string, notesFolder: string) => Promise<void>;
  clearSearch: () => void;
  findBacklinks: (noteName: string) => Promise<void>;
  scanAllTags: () => Promise<void>;
  setSelectedTag: (tag: string | null) => void;
}

let metaStore: Store | null = null;

const getMetaStore = async () => {
  if (!metaStore) {
    metaStore = await Store.load("notes-meta.json");
  }
  return metaStore;
};

export const useNoteStore = create<NoteState>((set, get) => ({
  files: [],
  currentNote: null,
  content: "",
  isDirty: false,
  isLoading: false,
  isSaving: false,
  favorites: [],
  recentNotes: [],
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  backlinks: [],
  allTags: [],
  selectedTag: null,

  setFiles: (files: FileNode[]) => {
    const { favorites } = get();
    const markFavorites = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => ({
        ...node,
        isFavorite: favorites.includes(node.path),
        children: node.children ? markFavorites(node.children) : undefined,
      }));
    };
    set({ files: markFavorites(files) });
  },

  setCurrentNote: (path: string | null) => {
    set({ currentNote: path });
  },

  setContent: (content: string) => {
    const { currentNote } = get();
    set({ content, isDirty: currentNote !== null });
  },

  setIsDirty: (isDirty: boolean) => {
    set({ isDirty });
  },

  setIsSaving: (isSaving: boolean) => {
    set({ isSaving });
  },

  loadNote: async (path: string) => {
    set({ isLoading: true });
    try {
      const content = await readTextFile(path);

      // Update recent notes
      const { recentNotes } = get();
      const updated = [path, ...recentNotes.filter((p) => p !== path)].slice(0, 10);
      const store = await getMetaStore();
      await store.set("recentNotes", updated);
      await store.save();

      set({
        currentNote: path,
        content,
        isDirty: false,
        isLoading: false,
        recentNotes: updated,
      });
    } catch (error) {
      console.error("Failed to load note:", error);
      set({ isLoading: false });
    }
  },

  saveNote: async () => {
    const { currentNote, content, isDirty } = get();
    if (!currentNote || !isDirty) return;

    try {
      await writeTextFile(currentNote, content);
      set({ isDirty: false });
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  },

  toggleFavorite: async (path: string) => {
    const { favorites, files } = get();
    const isFavorite = favorites.includes(path);
    const updated = isFavorite
      ? favorites.filter((p) => p !== path)
      : [...favorites, path];

    const store = await getMetaStore();
    await store.set("favorites", updated);
    await store.save();

    // Update files with new favorite status
    const updateFavorites = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => ({
        ...node,
        isFavorite: updated.includes(node.path),
        children: node.children ? updateFavorites(node.children) : undefined,
      }));
    };

    set({ favorites: updated, files: updateFavorites(files) });
  },

  loadFavorites: async () => {
    try {
      const store = await getMetaStore();
      const favorites = (await store.get<string[]>("favorites")) || [];
      const recentNotes = (await store.get<string[]>("recentNotes")) || [];
      set({ favorites, recentNotes });
    } catch (error) {
      console.error("Failed to load favorites:", error);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  searchNotes: async (query: string, _notesFolder: string) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery: query });

    try {
      const { files } = get();
      const results: SearchResult[] = [];
      const searchLower = query.toLowerCase();

      const searchInFiles = async (nodes: FileNode[]) => {
        for (const node of nodes) {
          if (node.isDirectory && node.children) {
            await searchInFiles(node.children);
          } else if (node.path.endsWith(".md")) {
            try {
              const content = await readTextFile(node.path);
              const lines = content.split("\n");
              const matches: { line: number; text: string }[] = [];

              lines.forEach((line, index) => {
                if (line.toLowerCase().includes(searchLower)) {
                  matches.push({ line: index + 1, text: line.trim() });
                }
              });

              if (matches.length > 0 || node.name.toLowerCase().includes(searchLower)) {
                results.push({
                  path: node.path,
                  name: node.name,
                  matches: matches.slice(0, 3),
                });
              }
            } catch (e) {
              // Skip files that can't be read
            }
          }
        }
      };

      await searchInFiles(files);
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error("Search failed:", error);
      set({ isSearching: false });
    }
  },

  clearSearch: () => {
    set({ searchQuery: "", searchResults: [], isSearching: false });
  },

  findBacklinks: async (noteName: string) => {
    const { files } = get();
    const backlinks: Backlink[] = [];
    const escapedName = noteName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchPattern = new RegExp(`\\[\\[${escapedName}\\]\\]`, 'gi');

    const searchInFiles = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.isDirectory && node.children) {
          await searchInFiles(node.children);
        } else if (node.path.endsWith(".md")) {
          try {
            const content = await readTextFile(node.path);
            const lines = content.split("\n");

            for (let i = 0; i < lines.length; i++) {
              if (searchPattern.test(lines[i])) {
                backlinks.push({
                  path: node.path,
                  name: node.name.replace(/\.md$/, ""),
                  context: lines[i].trim().slice(0, 100),
                });
                break;
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    };

    await searchInFiles(files);
    set({ backlinks });
  },

  scanAllTags: async () => {
    const { files } = get();
    const tagCounts = new Map<string, number>();
    const tagRegex = /(?<=\s|^)#([a-zA-Z][a-zA-Z0-9_-]*)/g;

    const scanFiles = async (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.isDirectory && node.children) {
          await scanFiles(node.children);
        } else if (node.path.endsWith(".md")) {
          try {
            const content = await readTextFile(node.path);
            let match;
            while ((match = tagRegex.exec(content)) !== null) {
              const tag = match[1].toLowerCase();
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    };

    await scanFiles(files);

    const allTags: TagInfo[] = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    set({ allTags });
  },

  setSelectedTag: (tag: string | null) => {
    set({ selectedTag: tag });
  },
}));
