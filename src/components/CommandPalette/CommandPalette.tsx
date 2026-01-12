import { useState, useEffect, useCallback, useRef } from "react";
import { useNoteStore } from "../../store/noteStore";
import { useSettingsStore } from "../../store/settingsStore";

interface Command {
  id: string;
  name: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { saveNote, files, loadNote } = useNoteStore();
  const { theme, setTheme, setViewMode, setActiveTab } = useSettingsStore();

  const commands: Command[] = [
    // File commands
    {
      id: "save",
      name: "Save Note",
      shortcut: "Cmd+S",
      category: "File",
      action: () => saveNote(),
    },
    // View commands
    {
      id: "toggle-theme",
      name: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
      category: "View",
      action: () => setTheme(theme === "dark" ? "light" : "dark"),
    },
    {
      id: "split-view",
      name: "Split View (Editor + Preview)",
      category: "View",
      action: () => setViewMode("split"),
    },
    {
      id: "editor-only",
      name: "Editor Only",
      category: "View",
      action: () => {
        setViewMode("tabs");
        setActiveTab("editor");
      },
    },
    {
      id: "preview-only",
      name: "Preview Only",
      category: "View",
      action: () => {
        setViewMode("tabs");
        setActiveTab("preview");
      },
    },
    // Format commands
    {
      id: "format-bold",
      name: "Format: Bold",
      shortcut: "Cmd+B",
      category: "Format",
      action: () => dispatchFormatEvent("bold"),
    },
    {
      id: "format-italic",
      name: "Format: Italic",
      shortcut: "Cmd+I",
      category: "Format",
      action: () => dispatchFormatEvent("italic"),
    },
    {
      id: "format-code",
      name: "Format: Code",
      category: "Format",
      action: () => dispatchFormatEvent("code"),
    },
    {
      id: "format-link",
      name: "Format: Link",
      shortcut: "Cmd+K",
      category: "Format",
      action: () => dispatchFormatEvent("link"),
    },
    {
      id: "format-h1",
      name: "Format: Heading 1",
      category: "Format",
      action: () => dispatchFormatEvent("h1"),
    },
    {
      id: "format-h2",
      name: "Format: Heading 2",
      category: "Format",
      action: () => dispatchFormatEvent("h2"),
    },
    {
      id: "format-h3",
      name: "Format: Heading 3",
      category: "Format",
      action: () => dispatchFormatEvent("h3"),
    },
    {
      id: "format-bullet-list",
      name: "Format: Bullet List",
      category: "Format",
      action: () => dispatchFormatEvent("ul"),
    },
    {
      id: "format-numbered-list",
      name: "Format: Numbered List",
      category: "Format",
      action: () => dispatchFormatEvent("ol"),
    },
    {
      id: "format-quote",
      name: "Format: Quote",
      category: "Format",
      action: () => dispatchFormatEvent("quote"),
    },
  ];

  // Add note navigation commands
  const getNoteCommands = (): Command[] => {
    const noteCommands: Command[] = [];
    const addNotes = (nodes: typeof files) => {
      for (const node of nodes) {
        if (!node.isDirectory) {
          noteCommands.push({
            id: `note-${node.path}`,
            name: `Go to: ${node.name.replace(".md", "")}`,
            category: "Navigate",
            action: () => loadNote(node.path),
          });
        }
        if (node.children) {
          addNotes(node.children);
        }
      }
    };
    addNotes(files);
    return noteCommands;
  };

  const allCommands = [...commands, ...getNoteCommands()];

  const filteredCommands = query
    ? allCommands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(query.toLowerCase()) ||
          cmd.category.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands;

  const dispatchFormatEvent = (format: string) => {
    window.dispatchEvent(new CustomEvent("format-text", { detail: format }));
  };

  const executeCommand = useCallback(
    (command: Command) => {
      command.action();
      onClose();
      setQuery("");
      setSelectedIndex(0);
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          setQuery("");
          setSelectedIndex(0);
          break;
      }
    },
    [filteredCommands, selectedIndex, executeCommand, onClose]
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group commands by category
  const groupedCommands: { [key: string]: Command[] } = {};
  filteredCommands.forEach((cmd) => {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = [];
    }
    groupedCommands[cmd.category].push(cmd);
  });

  let globalIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-xl bg-white dark:bg-zinc-800 rounded-lg shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-700 rounded-md text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-80 overflow-y-auto">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category}>
              <div className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900/50">
                {category}
              </div>
              {cmds.map((cmd) => {
                const index = globalIndex++;
                return (
                  <button
                    key={cmd.id}
                    data-index={index}
                    onClick={() => executeCommand(cmd)}
                    className={`w-full px-4 py-2 text-left flex items-center justify-between ${
                      index === selectedIndex
                        ? "bg-blue-500 text-white"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    }`}
                  >
                    <span>{cmd.name}</span>
                    {cmd.shortcut && (
                      <span
                        className={`text-xs ${
                          index === selectedIndex
                            ? "text-blue-100"
                            : "text-zinc-400"
                        }`}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
              No commands found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
