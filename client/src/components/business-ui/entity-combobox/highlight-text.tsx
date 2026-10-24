'use client';

import { useMemo } from 'react';

export type HighlightTextProps = {
  text: string;
  highlight?: string;
  className?: string;
  highlightClassName?: string;
};

export const HighlightText = ({
  text,
  highlight,
  className,
  highlightClassName = 'text-primary',
}: HighlightTextProps) => {
  const parts = useMemo(() => {
    if (!highlight?.trim()) {
      return [{ text, isMatch: false }];
    }

    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const splitParts = text.split(regex);

    return splitParts
      .filter((part) => part !== '')
      .map((part) => ({
        text: part,
        isMatch: part.toLowerCase() === highlight.toLowerCase(),
      }));
  }, [text, highlight]);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.isMatch ? (
          <span key={index} className={highlightClassName}>
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
};
