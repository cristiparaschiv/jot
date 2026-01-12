import { useMemo } from "react";

export interface Heading {
  id: string;
  text: string;
  level: number;
  line: number;
}

export function useMarkdownHeadings(content: string): Heading[] {
  return useMemo(() => {
    const lines = content.split("\n");
    const headings: Heading[] = [];
    const headingRegex = /^(#{1,6})\s+(.+)$/;

    lines.forEach((line, index) => {
      const match = headingRegex.exec(line);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-");

        headings.push({ id, text, level, line: index + 1 });
      }
    });

    return headings;
  }, [content]);
}
