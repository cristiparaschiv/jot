import { useCallback, useRef } from "react";

export function useSyncScroll() {
  const isScrollingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  const handleScroll = useCallback(
    (
      sourceElement: HTMLElement,
      targetElement: HTMLElement | null,
      _source: "editor" | "preview"
    ) => {
      if (!targetElement || isScrollingRef.current) return;

      // Prevent feedback loop
      isScrollingRef.current = true;

      const sourceScrollHeight = sourceElement.scrollHeight - sourceElement.clientHeight;
      const scrollRatio = sourceScrollHeight > 0
        ? sourceElement.scrollTop / sourceScrollHeight
        : 0;

      const targetScrollHeight = targetElement.scrollHeight - targetElement.clientHeight;
      targetElement.scrollTop = scrollRatio * targetScrollHeight;

      // Reset flag after a short delay
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 50);
    },
    []
  );

  return { handleScroll, isScrollingRef };
}
