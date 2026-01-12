import { useRef, useEffect, useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useNoteStore, FileNode } from "../../store/noteStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useToastStore } from "../../store/toastStore";
import { useScrollSync } from "../../context/ScrollSyncContext";
import { convertFileSrc } from "@tauri-apps/api/core";

// Custom plugin to handle wiki links [[note]] and tags #tag
function processWikiLinksAndTags(content: string): string {
  // Convert [[wiki links]] to markdown links
  let processed = content.replace(
    /\[\[([^\]]+)\]\]/g,
    (_, linkText) => `[${linkText}](wikilink:${encodeURIComponent(linkText)})`
  );

  // Convert #tags (but not ## headings)
  processed = processed.replace(
    /(?<=\s|^)#([a-zA-Z][a-zA-Z0-9_-]*)/g,
    (_, tag) => `[#${tag}](tag:${tag})`
  );

  return processed;
}

export function MarkdownPreview() {
  const { content, currentNote, files, loadNote } = useNoteStore();
  const { notesFolder } = useSettingsStore();
  const toast = useToastStore();
  const { setPreviewRef, handlePreviewScroll } = useScrollSync();
  const previewRef = useRef<HTMLDivElement>(null);

  // Convert relative image path to absolute file URL
  const resolveImageSrc = (src: string): string => {
    if (!src) return src;
    // Already absolute URL or data URL
    if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
      return src;
    }
    // Relative path - resolve against notes folder
    if (notesFolder && !src.startsWith("/")) {
      const absolutePath = `${notesFolder}/${src}`;
      return convertFileSrc(absolutePath);
    }
    // Absolute path
    if (src.startsWith("/")) {
      return convertFileSrc(src);
    }
    return src;
  };

  // Set up scroll sync ref
  useEffect(() => {
    setPreviewRef(previewRef.current);
  }, [setPreviewRef]);

  // Process content for wiki links and tags
  const processedContent = useMemo(() => {
    return processWikiLinksAndTags(content);
  }, [content]);

  // Find a note by name in the file tree
  const findNoteByName = (name: string, nodes: FileNode[]): FileNode | null => {
    const searchName = name.toLowerCase();
    for (const node of nodes) {
      if (!node.isDirectory) {
        const noteName = node.name.replace(/\.md$/, "").toLowerCase();
        if (noteName === searchName) {
          return node;
        }
      }
      if (node.children) {
        const found = findNoteByName(name, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const handleLinkClick = (href: string) => {
    if (href.startsWith("wikilink:")) {
      const noteName = decodeURIComponent(href.replace("wikilink:", ""));
      const note = findNoteByName(noteName, files);
      if (note) {
        loadNote(note.path);
      } else {
        toast.warning(`Note "${noteName}" not found. Create it first.`);
      }
    } else if (href.startsWith("tag:")) {
      const tag = href.replace("tag:", "");
      const { setSelectedTag } = useNoteStore.getState();
      setSelectedTag(tag);
    }
  };

  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
        <p>Select a note to preview</p>
      </div>
    );
  }

  return (
    <div
      ref={previewRef}
      className="flex-1 overflow-y-auto p-6 prose prose-zinc dark:prose-invert max-w-none"
      onScroll={handlePreviewScroll}
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          img({ src, alt, ...props }) {
            const resolvedSrc = resolveImageSrc(src || "");
            return (
              <img
                src={resolvedSrc}
                alt={alt || ""}
                className="max-w-full h-auto rounded-lg"
                loading="lazy"
                {...props}
              />
            );
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-sm"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                className="rounded-lg text-sm"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            );
          },
          a({ href, children, ...props }) {
            const isWikiLink = href?.startsWith("wikilink:");
            const isTag = href?.startsWith("tag:");

            if (isWikiLink || isTag) {
              return (
                <a
                  {...props}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (href) handleLinkClick(href);
                  }}
                  className={
                    isWikiLink
                      ? "text-blue-600 dark:text-blue-400 hover:underline cursor-pointer bg-blue-50 dark:bg-blue-900/20 px-1 rounded"
                      : "text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  }
                >
                  {children}
                </a>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          h1({ children, ...props }) {
            const id = String(children)
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            return (
              <h1 id={id} {...props}>
                {children}
              </h1>
            );
          },
          h2({ children, ...props }) {
            const id = String(children)
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            return (
              <h2 id={id} {...props}>
                {children}
              </h2>
            );
          },
          h3({ children, ...props }) {
            const id = String(children)
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            return (
              <h3 id={id} {...props}>
                {children}
              </h3>
            );
          },
          h4({ children, ...props }) {
            const id = String(children)
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            return (
              <h4 id={id} {...props}>
                {children}
              </h4>
            );
          },
          h5({ children, ...props }) {
            const id = String(children)
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            return (
              <h5 id={id} {...props}>
                {children}
              </h5>
            );
          },
          h6({ children, ...props }) {
            const id = String(children)
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-");
            return (
              <h6 id={id} {...props}>
                {children}
              </h6>
            );
          },
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
}
