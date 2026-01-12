import { useState } from "react";
import { useSettingsStore } from "../../store/settingsStore";
import { useNoteStore } from "../../store/noteStore";
import { selectFolder, readNotesDirectory } from "../../lib/fileSystem";
import { useToastStore } from "../../store/toastStore";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { notesFolder, setNotesFolder, theme, setTheme } = useSettingsStore();
  const { setFiles, setCurrentNote } = useNoteStore();
  const toast = useToastStore();
  const [isChangingFolder, setIsChangingFolder] = useState(false);

  if (!isOpen) return null;

  const handleChangeFolder = async () => {
    setIsChangingFolder(true);
    try {
      const folder = await selectFolder();
      if (folder) {
        await setNotesFolder(folder);
        // Reload the file tree with new folder
        const files = await readNotesDirectory(folder);
        setFiles(files);
        // Clear current note since it may not exist in new folder
        setCurrentNote(null);
        toast.success(`Notes folder changed to: ${folder.split("/").pop()}`);
        onClose();
      }
    } catch (error) {
      console.error("Failed to change folder:", error);
      toast.error("Failed to change notes folder");
    } finally {
      setIsChangingFolder(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-md bg-white dark:bg-zinc-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Notes Folder */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Notes Folder
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-md text-sm text-zinc-700 dark:text-zinc-300 truncate">
                {notesFolder || "Not set"}
              </div>
              <button
                onClick={handleChangeFolder}
                disabled={isChangingFolder}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-md transition-colors"
              >
                {isChangingFolder ? "..." : "Change"}
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Select the folder where your markdown notes are stored
            </p>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Theme
            </label>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    theme === t
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-600"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* App Info */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
              Jot v0.1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
