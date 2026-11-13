import { useMemo } from 'react';
import { tokenizeCiscoLine } from '../components/CiscoSyntaxHighlighter';

export function useCiscoHighlighter(scriptText: string) {
  const tokenizedLines = useMemo(() => {
    return scriptText.split('\n').map((line) => ({
      raw: line,
      tokens: tokenizeCiscoLine(line),
    }));
  }, [scriptText]);

  return {
    lines: tokenizedLines,
    lineCount: tokenizedLines.length,
  };
}
