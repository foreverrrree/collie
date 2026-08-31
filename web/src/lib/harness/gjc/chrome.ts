import { lineText, type StyledLine } from "../../blocks";

const TOP = /^╭─{20,}╮(?:\s.*)?$/;
const BOTTOM = /^╰─{20,}╯(?:\s.*)?$/;
const COMPOSER_SCAN = 12;

interface ComposerBox {
  top: number;
  bottom: number;
  body: string[];
}

function innerRow(text: string): string | null {
  if (!text.startsWith("│")) return null;
  const close = text.lastIndexOf("│");
  if (close <= 0) return null;
  return text.slice(1, close);
}

function locateComposer(lines: StyledLine[]): ComposerBox | null {
  const texts = lines.map(lineText);
  let bottom = texts.length - 1;
  while (bottom >= 0 && texts[bottom]!.trim() === "") bottom--;

  // GJC paints a small logo to the right of the last body/border rows, so the border is allowed a
  // trailing run. It still has to be a complete rounded box at the buffer tail.
  if (bottom < 2 || !BOTTOM.test(texts[bottom]!.trimEnd())) return null;

  const floor = Math.max(0, bottom - COMPOSER_SCAN);
  for (let top = bottom - 2; top >= floor; top--) {
    if (!TOP.test(texts[top]!.trimEnd())) continue;
    const body = texts.slice(top + 1, bottom).map(innerRow);
    if (body.some((row) => row === null)) return null;
    if (!body[0]!.trimStart().startsWith(">")) return null;
    return { top, bottom, body: body as string[] };
  }
  return null;
}

export function hasComposer(lines: StyledLine[]): boolean {
  return locateComposer(lines) !== null;
}

export function composerPrompt(lines: StyledLine[]): string | null {
  const box = locateComposer(lines);
  return box === null ? null : lineText(lines[box.top + 1]!);
}

export function extractInputDraft(lines: StyledLine[]): string | null {
  const box = locateComposer(lines);
  if (box === null) return null;

  const parts = box.body.map((row, index) => {
    const content = index === 0 ? row.replace(/^\s*>\s?/, "") : row;
    return content.trim();
  });
  const draft = parts.filter(Boolean).join(" ").trim();
  return draft === "" || draft.startsWith("Type your message...") ? null : draft;
}

// GJC's status row remains in the raw mirror; unlike omp, this adapter does not peel it off and must
// not surface a duplicate above the app composer.
export function extractStatusLines(_lines: StyledLine[]): StyledLine[] {
  return [];
}
