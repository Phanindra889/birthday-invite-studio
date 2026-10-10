// Minimal text markup used in every editable message:
//   *word*  -> highlighted (gold, 3D) segment
//   newline -> forced line break

export interface TextSegment {
  text: string;
  highlight: boolean;
}

export function parseMarkup(input: string): TextSegment[][] {
  return input
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => {
      const segments: TextSegment[] = [];
      const parts = line.split('*');
      // An unmatched trailing "*" is treated as literal text.
      const balanced = parts.length % 2 === 1;
      parts.forEach((part, i) => {
        if (!part) return;
        const highlight = balanced && i % 2 === 1;
        segments.push({ text: part, highlight });
      });
      if (!balanced) return [{ text: line.replace(/\*/g, ''), highlight: false }];
      return segments;
    })
    .filter((line) => line.length > 0);
}

export const plainText = (input: string) => input.replace(/\*/g, '').replace(/\s*\n\s*/g, ' ').trim();
