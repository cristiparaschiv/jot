import { useState, ReactNode, useRef } from "react";
import type { FileNode } from "../../store/noteStore";
import { useNoteStore } from "../../store/noteStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { deleteItem, renameItem, moveItem } from "../../lib/fileSystem";

interface TreeNodeProps {
  node: FileNode;
  isSelected: boolean;
  onSelect: () => void;
  onRefresh: () => Promise<void>;
  children?: ReactNode;
}

interface MenuPosition {
  x: number;
  y: number;
}

// Helper to collect all folders from file tree
function collectFolders(nodes: FileNode[], currentPath: string): FileNode[] {
  const folders: FileNode[] = [];
  for (const node of nodes) {
    if (node.isDirectory && node.path !== currentPath) {
      folders.push(node);
      if (node.children) {
        folders.push(...collectFolders(node.children, currentPath));
      }
    }
  }
  return folders;
}

export function TreeNode({
  node,
  isSelected,
  onSelect,
  onRefresh,
  children,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const moveButtonRef = useRef<HTMLButtonElement>(null);
  const { toggleFavorite, files, currentNote, setCurrentNote } = useNoteStore();
  const { notesFolder } = useSettingsStore();
  const toast = useToastStore();

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${node.name}"?`
    );
    if (confirmed) {
      try {
        await deleteItem(node.path);
        if (currentNote === node.path) {
          setCurrentNote(null);
        }
        await onRefresh();
        toast.success(`Deleted "${node.name}"`);
      } catch (error) {
        toast.error("Failed to delete item");
      }
    }
    setShowMenu(false);
  };

  const handleRename = async () => {
    if (newName.trim() && newName !== node.name) {
      try {
        await renameItem(node.path, newName.trim());
        await onRefresh();
        toast.success(`Renamed to "${newName.trim()}"`);
      } catch (error) {
        toast.error("Failed to rename item");
      }
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewName(node.name);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(node.path);
  };

  const handleMove = async (targetFolder: string) => {
    try {
      const newPath = await moveItem(node.path, targetFolder);
      if (newPath) {
        if (currentNote === node.path) {
          setCurrentNote(newPath);
        }
        await onRefresh();
        toast.success(`Moved "${node.name}" to ${targetFolder.split("/").pop() || "root"}`);
      } else {
        toast.error("Failed to move item - it may already exist in that location");
      }
    } catch (error) {
      toast.error("Failed to move item");
    }
    setShowMoveMenu(false);
    setShowMenu(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (node.isDirectory) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (!node.isDirectory) return;

    const sourcePath = e.dataTransfer.getData("text/plain");
    if (!sourcePath || sourcePath === node.path) return;

    if (node.path.startsWith(sourcePath + "/")) {
      toast.error("Cannot move a folder into itself");
      return;
    }

    try {
      const newPath = await moveItem(sourcePath, node.path);
      if (newPath) {
        if (currentNote === sourcePath) {
          setCurrentNote(newPath);
        }
        await onRefresh();
        const itemName = sourcePath.split("/").pop();
        toast.success(`Moved "${itemName}" to "${node.name}"`);
      } else {
        toast.error("Failed to move item - it may already exist in that location");
      }
    } catch (error) {
      toast.error("Failed to move item");
    }
  };

  const getAvailableFolders = () => {
    const currentParent = node.path.substring(0, node.path.lastIndexOf("/"));
    const folders = collectFolders(files, node.path);
    return folders.filter((f) => f.path !== currentParent);
  };

  const closeMenu = () => {
    setShowMenu(false);
    setShowMoveMenu(false);
    setMenuPosition(null);
  };

  // Calculate submenu position
  const getSubmenuPosition = () => {
    if (!moveButtonRef.current || !menuPosition) return {};
    const rect = moveButtonRef.current.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.right + 4,
    };
  };

  return (
    <div className="select-none">
      <div
        draggable={!isRenaming}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center gap-1 px-2 py-1 rounded cursor-pointer group relative ${
          isDragOver
            ? "bg-blue-200 dark:bg-blue-800/50 ring-2 ring-blue-500"
            : isSelected
            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-700/50 text-zinc-700 dark:text-zinc-300"
        }`}
        onClick={() => {
          if (node.isDirectory) {
            setIsExpanded(!isExpanded);
          } else {
            onSelect();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuPosition({ x: e.clientX, y: e.clientY });
          setShowMenu(true);
        }}
      >
        {/* Expand/Collapse Icon for Folders */}
        {node.isDirectory && (
          <svg
            className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}

        {/* File/Folder Icon */}
        {node.isDirectory ? (
          <svg
            className={`w-4 h-4 ${isDragOver ? "text-blue-600" : "text-amber-500"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}

        {/* Name */}
        {isRenaming ? (
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="flex-1 px-1 text-sm bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 rounded focus:outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm truncate">{node.name}</span>
        )}

        {/* Favorite Star */}
        {!node.isDirectory && (
          <button
            onClick={handleToggleFavorite}
            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
              node.isFavorite ? "opacity-100" : ""
            }`}
            title={node.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <svg
              className={`w-3.5 h-3.5 ${
                node.isFavorite
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-zinc-400 hover:text-yellow-500"
              }`}
              fill={node.isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Context Menu - Fixed position outside overflow */}
      {showMenu && menuPosition && (
        <>
          <div className="fixed inset-0 z-50" onClick={closeMenu} />
          <div
            className="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg py-1 min-w-[140px]"
            style={{ top: menuPosition.y, left: menuPosition.x }}
          >
            {!node.isDirectory && (
              <button
                className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMenu();
                  toggleFavorite(node.path);
                }}
              >
                {node.isFavorite ? "Unfavorite" : "Favorite"}
              </button>
            )}
            <button
              ref={moveButtonRef}
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-between"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(!showMoveMenu);
              }}
            >
              <span>Move to...</span>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              onClick={(e) => {
                e.stopPropagation();
                closeMenu();
                setIsRenaming(true);
              }}
            >
              Rename
            </button>
            <button
              className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-red-600 dark:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
            >
              Delete
            </button>
          </div>

          {/* Move submenu - Fixed position */}
          {showMoveMenu && (
            <div
              className="fixed z-50 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-lg py-1 min-w-[150px] max-h-60 overflow-y-auto"
              style={getSubmenuPosition()}
            >
              {/* Root folder option */}
              {notesFolder && node.path.substring(0, node.path.lastIndexOf("/")) !== notesFolder && (
                <button
                  className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMove(notesFolder);
                  }}
                >
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  <span>/ (Root)</span>
                </button>
              )}
              {getAvailableFolders().length > 0 ? (
                getAvailableFolders().map((folder) => (
                  <button
                    key={folder.path}
                    className="w-full px-3 py-1.5 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(folder.path);
                    }}
                  >
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                  No other folders
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Children */}
      {node.isDirectory && isExpanded && children && (
        <div className="ml-4">{children}</div>
      )}
    </div>
  );
}
