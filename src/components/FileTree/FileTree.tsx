import { useState, useCallback, useMemo, useEffect } from "react";
import { useNoteStore, FileNode } from "../../store/noteStore";
import { useSettingsStore } from "../../store/settingsStore";
import { TreeNode } from "./TreeNode";
import {
  readNotesDirectory,
  createNote,
  createFolder,
} from "../../lib/fileSystem";

export function FileTree() {
  const { files, setFiles, loadNote, currentNote, recentNotes, allTags, selectedTag, scanAllTags, setSelectedTag } = useNoteStore();
  const { notesFolder } = useSettingsStore();
  const [isCreating, setIsCreating] = useState<"note" | "folder" | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [activeSection, setActiveSection] = useState<"all" | "favorites" | "recent" | "tags">("all");

  // Scan tags when files change
  useEffect(() => {
    if (files.length > 0) {
      scanAllTags();
    }
  }, [files, scanAllTags]);

  const refreshFiles = useCallback(async () => {
    if (!notesFolder) return;
    const newFiles = await readNotesDirectory(notesFolder);
    setFiles(newFiles);
  }, [notesFolder, setFiles]);

  // Get favorite files
  const favoriteFiles = useMemo(() => {
    const findFavorites = (nodes: FileNode[]): FileNode[] => {
      const result: FileNode[] = [];
      for (const node of nodes) {
        if (node.isFavorite) {
          result.push(node);
        }
        if (node.children) {
          result.push(...findFavorites(node.children));
        }
      }
      return result;
    };
    return findFavorites(files);
  }, [files]);

  // Get recent files
  const recentFiles = useMemo(() => {
    const findByPath = (nodes: FileNode[], path: string): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node;
        if (node.children) {
          const found = findByPath(node.children, path);
          if (found) return found;
        }
      }
      return null;
    };

    return recentNotes
      .map((path) => findByPath(files, path))
      .filter((n): n is FileNode => n !== null)
      .slice(0, 5);
  }, [files, recentNotes]);

  const handleCreateNote = async () => {
    if (!notesFolder || !newItemName.trim()) return;
    const path = await createNote(notesFolder, newItemName.trim());
    if (path) {
      await refreshFiles();
      await loadNote(path);
    }
    setIsCreating(null);
    setNewItemName("");
  };

  const handleCreateFolder = async () => {
    if (!notesFolder || !newItemName.trim()) return;
    await createFolder(notesFolder, newItemName.trim());
    await refreshFiles();
    setIsCreating(null);
    setNewItemName("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (isCreating === "note") handleCreateNote();
      else if (isCreating === "folder") handleCreateFolder();
    } else if (e.key === "Escape") {
      setIsCreating(null);
      setNewItemName("");
    }
  };

  const renderTree = (nodes: FileNode[]) => {
    return nodes.map((node) => (
      <TreeNode
        key={node.path}
        node={node}
        isSelected={currentNote === node.path}
        onSelect={() => !node.isDirectory && loadNote(node.path)}
        onRefresh={refreshFiles}
      >
        {node.children && node.children.length > 0 && renderTree(node.children)}
      </TreeNode>
    ));
  };

  const renderFlatList = (nodes: FileNode[]) => {
    return nodes.map((node) => (
      <TreeNode
        key={node.path}
        node={node}
        isSelected={currentNote === node.path}
        onSelect={() => loadNote(node.path)}
        onRefresh={refreshFiles}
      />
    ));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Files
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setIsCreating("note")}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            title="New Note"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
          <button
            onClick={() => setIsCreating("folder")}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            title="New Folder"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-700">
        {[
          { id: "all", label: "All" },
          { id: "favorites", label: "Favs" },
          { id: "recent", label: "Recent" },
          { id: "tags", label: "Tags" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as typeof activeSection)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              activeSection === tab.id
                ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* New Item Input */}
      {isCreating && (
        <div className="p-2 border-b border-zinc-200 dark:border-zinc-700">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isCreating === "note" ? "Note name..." : "Folder name..."}
            className="w-full px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>
      )}

      {/* Active Filter Indicator */}
      {selectedTag && activeSection !== "tags" && (
        <div className="px-2 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between">
          <span className="text-xs text-purple-700 dark:text-purple-300">
            Filtering: <span className="font-medium">#{selectedTag}</span>
          </span>
          <button
            onClick={() => setSelectedTag(null)}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-2">
        {activeSection === "all" && (
          files.length > 0 ? (
            <div className="space-y-0.5">{renderTree(files)}</div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
              No notes yet
            </p>
          )
        )}

        {activeSection === "favorites" && (
          favoriteFiles.length > 0 ? (
            <div className="space-y-0.5">{renderFlatList(favoriteFiles)}</div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
              No favorites yet. Click the star icon on a note to add it.
            </p>
          )
        )}

        {activeSection === "recent" && (
          recentFiles.length > 0 ? (
            <div className="space-y-0.5">{renderFlatList(recentFiles)}</div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
              No recent notes
            </p>
          )
        )}

        {activeSection === "tags" && (
          <div className="space-y-1">
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="w-full px-2 py-1 text-xs text-left text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center gap-1"
              >
                <span>Clear filter: #{selectedTag}</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {allTags.length > 0 ? (
              allTags.map((tagInfo) => (
                <button
                  key={tagInfo.tag}
                  onClick={() => setSelectedTag(tagInfo.tag)}
                  className={`w-full px-2 py-1 text-sm text-left rounded flex items-center justify-between ${
                    selectedTag === tagInfo.tag
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-purple-600 dark:text-purple-400">#{tagInfo.tag}</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-500">{tagInfo.count}</span>
                </button>
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                No tags found. Use #tag in your notes.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
