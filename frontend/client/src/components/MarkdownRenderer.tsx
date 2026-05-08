import React from "react";

interface Props {
  content: string;
}

// ── Inline bold / italic / code ────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[1]) {
      nodes.push(<strong key={match.index} className="font-semibold text-gray-900">{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={match.index} className="italic text-gray-600">{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(
        <code key={match.index} className="bg-gray-100 text-blue-700 rounded px-1 py-0.5 text-[13px] font-mono">
          {match[6]}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

// ── Pre-process: expand inline list items onto their own lines ─────────────────
// Handles patterns like:
//   "Symptoms include; - Fever - Cough - Fatigue."
//   "Signs: - Pain - Swelling"
function preprocessContent(raw: string): string {
  // Normalise Windows line endings
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return text
    .split("\n")
    .flatMap((line) => {
      // Only rewrite lines that are NOT already markdown list items / headings / HR
      if (/^[-*+#>]/.test(line.trim()) || /^\d+\./.test(line.trim())) {
        return [line];
      }

      // Detect embedded inline list:  "...text[;:] - item - item - item"
      // We allow "; -", ": -" or even just a sentence that contains " - " patterns
      const inlineListMatch = line.match(/^(.*?[;:])\s+-\s+(.+)$/);
      if (inlineListMatch) {
        const intro = inlineListMatch[1].trim(); // e.g. "The most common symptoms include;"
        const rest = inlineListMatch[2]; // e.g. "Increased thirst - Polyuria - ..."

        // Split the rest by " - " to get individual items
        const items = rest
          .split(/\s+-\s+/)
          .map((s) => s.replace(/\.\s*$/, "").trim()) // strip trailing period
          .filter(Boolean);

        const result: string[] = [];
        if (intro) result.push(intro);
        items.forEach((item) => result.push(`- ${item}`));
        return result;
      }

      return [line];
    })
    .join("\n");
}

// ── Main renderer ─────────────────────────────────────────────────────────────
export default function MarkdownRenderer({ content }: Props) {
  const processed = preprocessContent(content);
  const lines = processed.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`pre-${i}`} className="bg-gray-50 border border-gray-200 rounded-lg p-3 my-3 overflow-x-auto">
          <code className="text-[13px] font-mono text-gray-800">{codeLines.join("\n")}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Horizontal rule  (--- or ***)
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-gray-200" />);
      i++;
      continue;
    }

    // Headings
    if (/^### /.test(line)) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-gray-800 mt-3 mb-1">
          {parseInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (/^## /.test(line)) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-gray-900 mt-4 mb-2">
          {parseInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (/^# /.test(line)) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-lg font-bold text-gray-900 mt-4 mb-2">
          {parseInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Unordered list — collect consecutive items
    if (/^[-*+] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+] /, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-outside pl-5 mb-3 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed text-[15px]">
              {parseInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-outside pl-5 mb-3 space-y-1">
          {items.map((item, idx) => (
            <li key={idx} className="leading-relaxed text-[15px]">
              {parseInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={`bq-${i}`} className="border-l-4 border-blue-300 pl-4 my-3 text-gray-600 italic">
          {parseInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[-*+] /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i]) &&
      !/^#{1,3} /.test(lines[i]) &&
      !/^(-{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("> ")
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      elements.push(
        <p key={`p-${i}`} className="mb-3 last:mb-0 leading-relaxed text-[15px] text-justify">
          {paraLines.flatMap((l, idx) => [
            ...parseInline(l),
            idx < paraLines.length - 1 ? <br key={`br-${idx}`} /> : null,
          ])}
        </p>
      );
    }
  }

  return <>{elements}</>;
}
