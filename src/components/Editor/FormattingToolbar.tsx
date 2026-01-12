interface FormattingToolbarProps {
  onFormat: (format: string) => void;
  onAttachFile?: () => void;
}

const formatButtons = [
  { id: "bold", icon: "B", title: "Bold (Cmd+B)", className: "font-bold" },
  { id: "italic", icon: "I", title: "Italic (Cmd+I)", className: "italic" },
  { id: "strikethrough", icon: "S", title: "Strikethrough", className: "line-through" },
  { id: "code", icon: "</>", title: "Code", className: "font-mono text-xs" },
  { id: "link", icon: "🔗", title: "Link (Cmd+K)", className: "" },
  { id: "wikilink", icon: "[[]]", title: "Wiki Link", className: "font-mono text-xs" },
  { id: "h1", icon: "H1", title: "Heading 1", className: "font-bold text-xs" },
  { id: "h2", icon: "H2", title: "Heading 2", className: "font-bold text-xs" },
  { id: "h3", icon: "H3", title: "Heading 3", className: "font-bold text-xs" },
  { id: "ul", icon: "•", title: "Bullet List", className: "" },
  { id: "ol", icon: "1.", title: "Numbered List", className: "" },
  { id: "quote", icon: ">", title: "Quote", className: "" },
  { id: "tag", icon: "#", title: "Tag", className: "text-purple-600" },
  { id: "hr", icon: "—", title: "Horizontal Rule", className: "" },
];

export function FormattingToolbar({ onFormat, onAttachFile }: FormattingToolbarProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 py-1 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
      {formatButtons.map((btn, index) => (
        <span key={btn.id}>
          {(index === 4 || index === 8 || index === 10) && (
            <span className="w-px h-5 bg-zinc-300 dark:bg-zinc-600 mx-1" />
          )}
          <button
            onClick={() => onFormat(btn.id)}
            className={`px-2 py-1 rounded text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors ${btn.className}`}
            title={btn.title}
          >
            {btn.icon}
          </button>
        </span>
      ))}
      {/* Separator and attachment button */}
      <span className="w-px h-5 bg-zinc-300 dark:bg-zinc-600 mx-1" />
      <button
        onClick={() => onAttachFile?.()}
        className="px-2 py-1 rounded text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
        title="Attach File"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>
    </div>
  );
}

export function applyFormat(
  content: string,
  format: string,
  selectionStart: number,
  selectionEnd: number
): { newContent: string; newCursorPos: number } {
  const before = content.slice(0, selectionStart);
  const selected = content.slice(selectionStart, selectionEnd);
  const after = content.slice(selectionEnd);

  let insert = "";
  let cursorOffset = 0;

  switch (format) {
    case "bold":
      insert = `**${selected || "bold text"}**`;
      cursorOffset = selected ? insert.length : 2;
      break;
    case "italic":
      insert = `*${selected || "italic text"}*`;
      cursorOffset = selected ? insert.length : 1;
      break;
    case "strikethrough":
      insert = `~~${selected || "strikethrough"}~~`;
      cursorOffset = selected ? insert.length : 2;
      break;
    case "code":
      if (selected.includes("\n")) {
        insert = `\`\`\`\n${selected || "code"}\n\`\`\``;
        cursorOffset = selected ? insert.length : 4;
      } else {
        insert = `\`${selected || "code"}\``;
        cursorOffset = selected ? insert.length : 1;
      }
      break;
    case "link":
      insert = `[${selected || "link text"}](url)`;
      cursorOffset = selected ? insert.length - 4 : 1;
      break;
    case "h1":
      insert = `# ${selected || "Heading 1"}`;
      cursorOffset = insert.length;
      break;
    case "h2":
      insert = `## ${selected || "Heading 2"}`;
      cursorOffset = insert.length;
      break;
    case "h3":
      insert = `### ${selected || "Heading 3"}`;
      cursorOffset = insert.length;
      break;
    case "ul":
      insert = `- ${selected || "list item"}`;
      cursorOffset = insert.length;
      break;
    case "ol":
      insert = `1. ${selected || "list item"}`;
      cursorOffset = insert.length;
      break;
    case "quote":
      insert = `> ${selected || "quote"}`;
      cursorOffset = insert.length;
      break;
    case "hr":
      insert = "\n---\n";
      cursorOffset = insert.length;
      break;
    default:
      insert = selected;
      cursorOffset = insert.length;
  }

  return {
    newContent: before + insert + after,
    newCursorPos: selectionStart + cursorOffset,
  };
}
