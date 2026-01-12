import { useMemo } from "react";

export interface WordStats {
  words: number;
  characters: number;
  readingTime: string;
}

export function useWordCount(content: string): WordStats {
  return useMemo(() => {
    const text = content.trim();
    if (!text) {
      return { words: 0, characters: 0, readingTime: "0 min" };
    }

    const words = text.split(/\s+/).filter((word) => word.length > 0).length;
    const characters = text.length;
    const minutes = Math.ceil(words / 200); // Average reading speed
    const readingTime = minutes === 1 ? "1 min" : `${minutes} min`;

    return { words, characters, readingTime };
  }, [content]);
}
