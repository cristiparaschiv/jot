import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Toolbar } from "./components/Toolbar";
import { FileTree } from "./components/FileTree/FileTree";
import { MarkdownEditor } from "./components/Editor/MarkdownEditor";
import { MarkdownPreview } from "./components/Editor/MarkdownPreview";
import { TableOfContents } from "./components/TableOfContents/TableOfContents";
import { FolderPicker } from "./components/Settings/FolderPicker";
import { CommandPalette } from "./components/CommandPalette/CommandPalette";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/Toast";
import { ScrollSyncProvider } from "./context/ScrollSyncContext";
import { useSettingsStore } from "./store/settingsStore";
import { useNoteStore } from "./store/noteStore";
import { readNotesDirectory } from "./lib/fileSystem";

function App() {
  const { notesFolder, isLoading, loadSettings } = useSettingsStore();
  const { setFiles, loadFavorites } = useNoteStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Load settings and favorites on mount
  useEffect(() => {
    loadSettings();
    loadFavorites();
  }, [loadSettings, loadFavorites]);

  // Load files when notes folder changes
  useEffect(() => {
    if (notesFolder) {
      readNotesDirectory(notesFolder).then(setFiles);
    }
  }, [notesFolder, setFiles]);

  // Command palette keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  // Show folder picker if no folder is selected
  if (!notesFolder) {
    return <FolderPicker />;
  }

  // Show main app
  return (
    <ErrorBoundary>
      <ScrollSyncProvider>
        <Layout
          toolbar={<Toolbar />}
          sidebar={
            <ErrorBoundary>
              <FileTree />
            </ErrorBoundary>
          }
          editor={
            <ErrorBoundary>
              <MarkdownEditor />
            </ErrorBoundary>
          }
          preview={
            <ErrorBoundary>
              <MarkdownPreview />
            </ErrorBoundary>
          }
          toc={
            <ErrorBoundary>
              <TableOfContents />
            </ErrorBoundary>
          }
        />
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
        />
        <ToastContainer />
      </ScrollSyncProvider>
    </ErrorBoundary>
  );
}

export default App;
