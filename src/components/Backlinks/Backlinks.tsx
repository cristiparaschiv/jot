import { useEffect } from "react";
import { useNoteStore } from "../../store/noteStore";

export function Backlinks() {
  const { currentNote, backlinks, findBacklinks, loadNote } = useNoteStore();

  useEffect(() => {
    if (currentNote) {
      const noteName = currentNote
        .split("/")
        .pop()
        ?.replace(/\.md$/, "");
      if (noteName) {
        findBacklinks(noteName);
      }
    }
  }, [currentNote, findBacklinks]);

  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-700 mt-4 pt-4">
      <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Backlinks ({backlinks.length})
      </h4>
      <ul className="space-y-2">
        {backlinks.map((backlink) => (
          <li key={backlink.path}>
            <button
              onClick={() => loadNote(backlink.path)}
              className="w-full text-left group"
            >
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                {backlink.name}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                {backlink.context}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
