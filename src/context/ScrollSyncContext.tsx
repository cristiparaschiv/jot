import { createContext, useContext, useRef, useCallback, useState, ReactNode } from "react";

interface ScrollSyncContextType {
  editorRef: React.RefObject<HTMLElement | null>;
  previewRef: React.RefObject<HTMLElement | null>;
  setEditorRef: (el: HTMLElement | null) => void;
  setPreviewRef: (el: HTMLElement | null) => void;
  syncEnabled: boolean;
  setSyncEnabled: (enabled: boolean) => void;
  handleEditorScroll: () => void;
  handlePreviewScroll: () => void;
}

const ScrollSyncContext = createContext<ScrollSyncContextType | null>(null);

export function ScrollSyncProvider({ children }: { children: ReactNode }) {
  const editorRef = useRef<HTMLElement | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const [syncEnabled, setSyncEnabled] = useState(true);

  const setEditorRef = useCallback((el: HTMLElement | null) => {
    editorRef.current = el;
  }, []);

  const setPreviewRef = useCallback((el: HTMLElement | null) => {
    previewRef.current = el;
  }, []);

  const syncScroll = useCallback((source: HTMLElement, target: HTMLElement) => {
    const sourceScrollHeight = source.scrollHeight - source.clientHeight;
    const scrollRatio = sourceScrollHeight > 0
      ? source.scrollTop / sourceScrollHeight
      : 0;

    const targetScrollHeight = target.scrollHeight - target.clientHeight;
    target.scrollTop = scrollRatio * targetScrollHeight;
  }, []);

  const handleEditorScroll = useCallback(() => {
    if (!syncEnabled || isScrollingRef.current || !editorRef.current || !previewRef.current) return;

    isScrollingRef.current = true;
    syncScroll(editorRef.current, previewRef.current);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);
  }, [syncEnabled, syncScroll]);

  const handlePreviewScroll = useCallback(() => {
    if (!syncEnabled || isScrollingRef.current || !editorRef.current || !previewRef.current) return;

    isScrollingRef.current = true;
    syncScroll(previewRef.current, editorRef.current);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);
  }, [syncEnabled, syncScroll]);

  return (
    <ScrollSyncContext.Provider
      value={{
        editorRef,
        previewRef,
        setEditorRef,
        setPreviewRef,
        syncEnabled,
        setSyncEnabled,
        handleEditorScroll,
        handlePreviewScroll,
      }}
    >
      {children}
    </ScrollSyncContext.Provider>
  );
}

export function useScrollSync() {
  const context = useContext(ScrollSyncContext);
  if (!context) {
    throw new Error("useScrollSync must be used within ScrollSyncProvider");
  }
  return context;
}
