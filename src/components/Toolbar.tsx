import { useState, useEffect, useRef } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useNoteStore } from "../store/noteStore";
import { useWordCount } from "../hooks/useWordCount";
import { SettingsModal } from "./Settings/SettingsModal";
import { openDailyNote, readNotesDirectory } from "../lib/fileSystem";
import { useToastStore } from "../store/toastStore";

export function Toolbar() {
  const { viewMode, setViewMode, activeTab, setActiveTab, theme, setTheme } =
    useSettingsStore();
  const {
    isDirty,
    isSaving,
    saveNote,
    currentNote,
    content,
    searchQuery,
    searchResults,
    searchNotes,
    clearSearch,
    loadNote,
    isSearching,
    setFiles,
  } = useNoteStore();
  const { notesFolder } = useSettingsStore();
  const { words, readingTime } = useWordCount(content);
  const toast = useToastStore();

  const [showSearch, setShowSearch] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number | null>(null);

  const handleSave = async () => {
    await saveNote();
  };

  const handleSearchChange = (value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(() => {
      if (notesFolder) {
        searchNotes(value, notesFolder);
      }
    }, 300);
  };

  const handleSearchResultClick = (path: string) => {
    loadNote(path);
    setShowSearch(false);
    clearSearch();
  };

  const handleDailyNote = async () => {
    if (!notesFolder) {
      toast.error("Please select a notes folder first");
      return;
    }
    try {
      const result = await openDailyNote(notesFolder);
      if (result) {
        // Refresh file tree to show Daily folder
        const files = await readNotesDirectory(notesFolder);
        setFiles(files);
        // Open the daily note
        loadNote(result.path);
        if (result.isNew) {
          toast.success("Created today's daily note");
        }
      } else {
        toast.error("Failed to open daily note");
      }
    } catch (error) {
      console.error("Failed to open daily note:", error);
      toast.error("Failed to open daily note");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "s") {
        e.preventDefault();
        saveNote();
      } else if (isMod && e.key === "p") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      } else if (e.key === "Escape") {
        setShowSearch(false);
        setShowShortcuts(false);
        clearSearch();
      } else if (isMod && e.key === "/") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      } else if (isMod && e.key === "d") {
        e.preventDefault();
        handleDailyNote();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNote, clearSearch, handleDailyNote]);

  const cycleTheme = () => {
    const themes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);
  };

  const ThemeIcon = () => {
    if (theme === "light") {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    } else if (theme === "dark") {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <>
      <header className="h-12 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between px-4 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Jot
          </h1>
          {currentNote && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <span>
                {currentNote.split("/").pop()}
                {isDirty && <span className="ml-1 text-amber-500">*</span>}
              </span>
              {isSaving && (
                <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Word Count */}
          {currentNote && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-2">
              {words} words · {readingTime} read
            </span>
          )}

          {/* Daily Note Button */}
          <button
            onClick={handleDailyNote}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title="Today's Daily Note (Cmd+D)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Search Button */}
          <button
            onClick={() => {
              setShowSearch(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title="Search (Cmd+P)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Save Button */}
          {currentNote && (
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Save (Cmd+S)"
            >
              Save
            </button>
          )}

          {/* Tab Toggle (only in tab mode) */}
          {viewMode === "tabs" && (
            <div className="flex rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
              <button
                onClick={() => setActiveTab("editor")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  activeTab === "editor"
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  activeTab === "preview"
                    ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
              >
                Preview
              </button>
            </div>
          )}

          {/* View Mode Toggle */}
          <button
            onClick={() => setViewMode(viewMode === "split" ? "tabs" : "split")}
            className="px-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title={viewMode === "split" ? "Switch to tab view" : "Switch to split view"}
          >
            {viewMode === "split" ? "Tab View" : "Split View"}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon />
          </button>

          {/* Keyboard Shortcuts */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title="Keyboard Shortcuts (Cmd+/)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title="Settings"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search Modal */}
      {showSearch && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh]"
          onClick={() => {
            setShowSearch(false);
            clearSearch();
          }}
        >
          <div
            className="w-full max-w-xl bg-white dark:bg-zinc-800 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search notes..."
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="p-4 text-center text-zinc-500">Searching...</div>
              ) : searchResults.length > 0 ? (
                <ul>
                  {searchResults.map((result) => (
                    <li key={result.path}>
                      <button
                        className="w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        onClick={() => handleSearchResultClick(result.path)}
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {result.name}
                        </div>
                        {result.matches.length > 0 && (
                          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                            {result.matches[0].text}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : searchQuery ? (
                <div className="p-4 text-center text-zinc-500">No results found</div>
              ) : (
                <div className="p-4 text-center text-zinc-500">
                  Type to search across all notes
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Keyboard Shortcuts
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {[
                { keys: ["Cmd", "S"], action: "Save note" },
                { keys: ["Cmd", "P"], action: "Search notes" },
                { keys: ["Cmd", "D"], action: "Daily note" },
                { keys: ["Cmd", "/"], action: "Show shortcuts" },
                { keys: ["Cmd", "B"], action: "Bold text" },
                { keys: ["Cmd", "I"], action: "Italic text" },
                { keys: ["Cmd", "K"], action: "Insert link" },
                { keys: ["Esc"], action: "Close modal" },
              ].map(({ keys, action }) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">{action}</span>
                  <div className="flex gap-1">
                    {keys.map((key) => (
                      <kbd
                        key={key}
                        className="px-2 py-1 text-xs font-medium bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded border border-zinc-300 dark:border-zinc-600"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
