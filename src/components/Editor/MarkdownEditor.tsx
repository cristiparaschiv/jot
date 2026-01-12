import { useCallback, useEffect, useRef, useState } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { EditorView } from "@codemirror/view";
import { useNoteStore } from "../../store/noteStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useScrollSync } from "../../context/ScrollSyncContext";
import { FormattingToolbar } from "./FormattingToolbar";
import { saveImage, saveAttachment, selectFile } from "../../lib/fileSystem";
import { readFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useToastStore } from "../../store/toastStore";

// Constants
const AUTO_SAVE_DELAY_MS = 2000;

export function MarkdownEditor() {
  const { content, setContent, currentNote, saveNote, isDirty, setIsDirty, setIsSaving } = useNoteStore();
  const { notesFolder, theme } = useSettingsStore();
  const { setEditorRef, handleEditorScroll } = useScrollSync();
  const toast = useToastStore();
  const [isDragging, setIsDragging] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Track the note path and content for safe saving
  const pendingSaveRef = useRef<{ path: string; content: string } | null>(null);

  // Set up scroll sync ref
  useEffect(() => {
    if (scrollContainerRef.current) {
      const cmScroller = scrollContainerRef.current.querySelector(".cm-scroller");
      if (cmScroller) {
        setEditorRef(cmScroller as HTMLElement);
      }
    }
  }, [setEditorRef, currentNote]);

  const handleChange = useCallback(
    (value: string) => {
      setContent(value);

      // Track what we're about to save (path + content) to avoid race conditions
      if (currentNote) {
        pendingSaveRef.current = { path: currentNote, content: value };
      }

      // Auto-save after delay with no typing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(async () => {
        const pending = pendingSaveRef.current;
        if (pending && pending.path === currentNote) {
          setIsSaving(true);
          try {
            await writeTextFile(pending.path, pending.content);
            setIsDirty(false);
          } catch (error) {
            console.error("Auto-save failed:", error);
          } finally {
            setIsSaving(false);
          }
        }
      }, AUTO_SAVE_DELAY_MS);
    },
    [setContent, currentNote, setIsDirty]
  );

  const handleFormat = useCallback((format: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from, to } = view.state.selection.main;
    const selected = view.state.sliceDoc(from, to);

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
      case "wikilink":
        insert = `[[${selected || "note name"}]]`;
        cursorOffset = selected ? insert.length : 2;
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
      case "tag":
        insert = `#${selected || "tag"}`;
        cursorOffset = insert.length;
        break;
      default:
        return;
    }

    view.dispatch({
      changes: { from, to, insert },
      selection: { anchor: from + cursorOffset },
    });
    view.focus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === "s") {
        e.preventDefault();
        saveNote();
      } else if (isMod && e.key === "b") {
        e.preventDefault();
        handleFormat("bold");
      } else if (isMod && e.key === "i") {
        e.preventDefault();
        handleFormat("italic");
      } else if (isMod && e.key === "k") {
        e.preventDefault();
        handleFormat("link");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNote, handleFormat]);

  // Listen for format events from command palette
  useEffect(() => {
    const handleFormatEvent = (e: CustomEvent<string>) => {
      handleFormat(e.detail);
    };

    window.addEventListener("format-text", handleFormatEvent as EventListener);
    return () => window.removeEventListener("format-text", handleFormatEvent as EventListener);
  }, [handleFormat]);

  // Insert text at cursor position
  const insertTextAtCursor = useCallback((text: string) => {
    const view = editorRef.current?.view;
    if (!view) return;

    const { from } = view.state.selection.main;
    view.dispatch({
      changes: { from, to: from, insert: text },
      selection: { anchor: from + text.length },
    });
    view.focus();
  }, []);

  // Handle image file
  const handleImageFile = useCallback(async (file: File) => {
    if (!notesFolder || !file.type.startsWith("image/")) {
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      const ext = file.type.split("/")[1] || "png";
      const timestamp = Date.now();
      const fileName = `image-${timestamp}.${ext}`;

      const relativePath = await saveImage(notesFolder, data, fileName);
      if (relativePath) {
        insertTextAtCursor(`![${file.name || "image"}](${relativePath})`);
        toast.success("Image added");
      }
    } catch (error) {
      console.error("Failed to save image:", error);
      toast.error("Failed to save image");
    }
  }, [notesFolder, insertTextAtCursor, toast]);

  // Handle file attachment
  const handleAttachFile = useCallback(async () => {
    if (!notesFolder) {
      toast.error("No notes folder selected");
      return;
    }

    try {
      const filePath = await selectFile();
      if (!filePath) return;

      const data = await readFile(filePath);
      const fileName = filePath.split("/").pop() || "attachment";
      const relativePath = await saveAttachment(notesFolder, data, fileName);

      if (relativePath) {
        insertTextAtCursor(`[${fileName}](${relativePath})`);
        toast.success(`Attached: ${fileName}`);
      } else {
        toast.error("Failed to save attachment");
      }
    } catch (error) {
      console.error("Failed to attach file:", error);
      toast.error(`Failed to attach file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [notesFolder, insertTextAtCursor, toast]);

  // Set up paste handler on window (works globally when editor is focused)
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      // Only handle if we have a note open
      if (!currentNote || !notesFolder) return;

      console.log("Window paste event", e.clipboardData?.items);
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        console.log("Paste item type:", item.type);
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          console.log("Got image file from paste:", file);
          if (file) {
            await handleImageFile(file);
          }
          return;
        }
      }
    };

    window.addEventListener("paste", onPaste as unknown as EventListener);
    return () => window.removeEventListener("paste", onPaste as unknown as EventListener);
  }, [currentNote, notesFolder, handleImageFile]);

  // Set up drop handlers on container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (!currentNote || !notesFolder) return;

      console.log("Container drop event", e.dataTransfer?.files);
      const files = e.dataTransfer?.files;
      if (!files) return;

      for (const file of files) {
        console.log("Dropped file:", file.name, file.type);
        if (file.type.startsWith("image/")) {
          await handleImageFile(file);
          return;
        }
      }
    };

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    container.addEventListener("drop", onDrop as unknown as EventListener);
    container.addEventListener("dragover", onDragOver as unknown as EventListener);
    container.addEventListener("dragleave", onDragLeave as unknown as EventListener);

    return () => {
      container.removeEventListener("drop", onDrop as unknown as EventListener);
      container.removeEventListener("dragover", onDragOver as unknown as EventListener);
      container.removeEventListener("dragleave", onDragLeave as unknown as EventListener);
    };
  }, [currentNote, notesFolder, handleImageFile]);

  // Save pending changes when switching notes or unmounting
  useEffect(() => {
    // Capture current values for cleanup
    const capturedPath = currentNote;
    const capturedContent = content;
    const capturedIsDirty = isDirty;

    return () => {
      // Clear any pending auto-save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }

      // Save immediately if dirty, using captured values to avoid race condition
      if (capturedIsDirty && capturedPath) {
        writeTextFile(capturedPath, capturedContent).catch((error) => {
          console.error("Failed to save on note switch:", error);
        });
      }
    };
  }, [currentNote, content, isDirty]);

  if (!currentNote) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
        <p>Select a note to start editing</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <FormattingToolbar onFormat={handleFormat} onAttachFile={handleAttachFile} />
      <div ref={scrollContainerRef} className="flex-1 min-h-0 relative" onScroll={handleEditorScroll}>
        {isDragging && (
          <div className="absolute inset-0 z-10 bg-blue-500/20 border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-zinc-800 px-4 py-2 rounded-lg shadow-lg">
              <span className="text-blue-600 dark:text-blue-400 font-medium">Drop image here</span>
            </div>
          </div>
        )}
        <CodeMirror
          ref={editorRef}
          value={content}
          onChange={handleChange}
          height="100%"
          autoFocus
          spellCheck={true}
          extensions={[
            markdown({ base: markdownLanguage, codeLanguages: languages }),
            EditorView.lineWrapping,
            EditorView.editorAttributes.of({
              spellcheck: "true",
              autocorrect: "on",
              autocapitalize: "sentences"
            }),
            EditorView.contentAttributes.of({
              spellcheck: "true",
              autocorrect: "on",
              autocapitalize: "sentences"
            }),
            EditorView.domEventHandlers({
              scroll: handleEditorScroll,
            }),
          ]}
          className="h-full text-base"
          theme={theme === "light" ? "light" : "dark"}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: false,
            highlightSelectionMatches: true,
          }}
        />
      </div>
    </div>
  );
}
