/**
 * Convert markdown bold syntax to HTML while preserving formatting
 * Converts **text** to <strong>text</strong>
 */
export function parseMarkdownToJSX(text: string): (string | JSX.Element)[] {
  if (!text) return [];
  
  const parts: (string | JSX.Element)[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Add bold text
    parts.push(
      <strong key={`bold-${parts.length}`}>{match[1]}</strong>
    );
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}
