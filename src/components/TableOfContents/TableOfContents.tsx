import { useNoteStore } from "../../store/noteStore";
import { useMarkdownHeadings, Heading } from "../../hooks/useMarkdownHeadings";
import { Backlinks } from "../Backlinks/Backlinks";

export function TableOfContents() {
  const { content, currentNote } = useNoteStore();
  const headings = useMarkdownHeadings(content);

  if (!currentNote) {
    return (
      <div className="p-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No note selected
        </p>
      </div>
    );
  }

  const handleClick = (heading: Heading) => {
    // Scroll preview pane (if visible)
    const previewElement = document.getElementById(heading.id);
    if (previewElement) {
      previewElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Scroll editor pane to the line
    const cmContent = document.querySelector(".cm-content");
    if (cmContent) {
      const cmEditor = cmContent.closest(".cm-editor");
      const cmScroller = cmEditor?.querySelector(".cm-scroller");
      if (cmScroller && cmEditor) {
        // Get line height from the editor
        const lineElement = cmContent.querySelector(".cm-line");
        if (lineElement) {
          const lineHeight = lineElement.getBoundingClientRect().height;
          const targetScroll = (heading.line - 1) * lineHeight;
          cmScroller.scrollTo({ top: targetScroll, behavior: "smooth" });
        }
      }
    }
  };

  return (
    <nav className="p-3">
      <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
        On this page
      </h3>
      {headings.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          No headings found
        </p>
      ) : (
        <ul className="space-y-1">
          {headings.map((heading, index) => (
            <li
              key={`${heading.id}-${index}`}
              style={{ paddingLeft: `${(heading.level - 1) * 8}px` }}
            >
              <button
                onClick={() => handleClick(heading)}
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-left truncate w-full transition-colors"
                title={heading.text}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Backlinks />
    </nav>
  );
}
