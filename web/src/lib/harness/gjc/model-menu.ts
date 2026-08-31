import { isBlank, lineText, type PromptModel, type PromptOption, type StyledLine } from "../../blocks";

const TITLE = "Model presets";
const TAIL_RULE = /^─{20,}$/;
const POINTER = "❯ ";
const ROW_PREFIX = "  ";
const MENU_LOOKBACK = 50;
const PREVIEW = /^\s*Preset preview:\s*(.+)$/;
const APPLY_HINT = /^\s*Press Enter to (.+?)(?:\s+or\s+d\s+to\s+(.+))?$/i;

export interface GjcModelMenuRegion {
  model: PromptModel;
  startLine: number;
}

interface MenuRow {
  line: number;
  label: string;
  depth: number;
  selected: boolean;
}

function signature(lines: StyledLine[], from: number, to: number): string {
  return lines.slice(from, to + 1).map(lineText).join("\n");
}

function capitalise(value: string): string {
  const text = value.trim();
  return text === "" ? text : text[0]!.toUpperCase() + text.slice(1);
}

function navigationKeys(current: number, target: number, count: number): string[] {
  const down = (target - current + count) % count;
  const up = (current - target + count) % count;
  return down <= up ? Array(down).fill("Down") : Array(up).fill("Up");
}

function parseRows(texts: string[], from: number, to: number): MenuRow[] | null {
  const rows: MenuRow[] = [];
  for (let line = from; line < to; line++) {
    const text = texts[line]!;
    if (isBlank(text)) continue;
    const selected = text.startsWith(POINTER);
    if (!selected && !text.startsWith(ROW_PREFIX)) return null;
    const content = text.slice(2);
    const label = content.trim();
    if (label === "") return null;
    rows.push({ line, label, depth: content.length - content.trimStart().length, selected });
  }
  return rows.length > 0 && rows.filter((row) => row.selected).length === 1 ? rows : null;
}

function rowOptions(rows: MenuRow[]): PromptOption[] {
  const current = rows.findIndex((row) => row.selected);
  return rows.flatMap((row, target) => {
    // GJC deliberately lets the cursor land on these informational rows but Enter is a no-op. Do
    // not present a phone button that promises an action where the native component has none.
    if (
      row.label.startsWith("Already saved as ") ||
      row.label.startsWith("Select a model before creating")
    ) {
      return [];
    }

    // Source + live probe, GJC 0.15.6 (2026-08-31): a top-level ✓/✗ provider row opens with Right;
    // child profiles and the remaining action rows use Enter. Up/Down wrap over every physical row,
    // including the informational ones skipped above, so the navigation plan uses the original index.
    const opensGroup = row.depth === 0 && /^[✓✗…]\s/.test(row.label);
    const commit = opensGroup ? "Right" : "Enter";
    return [
      {
        label: row.label,
        keys: [...navigationKeys(current, target, rows.length), commit],
        keyLabel: opensGroup ? "→" : "↵",
      },
    ];
  });
}

/** Detect GJC's Ctrl+L model-preset landing and its preset-preview confirmation. */
export function detectGjcModelMenu(lines: StyledLine[]): GjcModelMenuRegion | null {
  const texts = lines.map(lineText);
  let tail = texts.length - 1;
  while (tail >= 0 && isBlank(texts[tail]!)) tail--;
  if (tail < 0 || !TAIL_RULE.test(texts[tail]!.trim())) return null;

  let title = -1;
  for (let i = tail - 1, seen = 0; i >= 0 && seen < MENU_LOOKBACK; i--, seen++) {
    if (texts[i]!.trim() === TITLE) {
      title = i;
      break;
    }
  }
  if (title < 0) return null;

  const signed = signature(lines, title, tail);
  const preview = texts.findIndex((text, i) => i > title && i < tail && PREVIEW.test(text));
  if (preview >= 0) {
    let hint = -1;
    let match: RegExpExecArray | null = null;
    for (let i = preview + 1; i < tail; i++) {
      match = APPLY_HINT.exec(texts[i]!);
      if (match !== null) {
        hint = i;
        break;
      }
    }
    if (hint < 0 || match === null) return null;
    const previewName = PREVIEW.exec(texts[preview]!)![1]!.trim();
    const options: PromptOption[] = [
      { label: capitalise(match[1]!), keys: ["Enter"], keyLabel: "↵" },
    ];
    if (match[2]) options.push({ label: capitalise(match[2]), keys: ["d"], keyLabel: "d" });
    return {
      startLine: preview,
      model: {
        question: `Preset preview: ${previewName}`,
        options,
        family: "select",
        coreSignature: signed,
        signature: signed,
      },
    };
  }

  // The blank search input (`>`) is the hard boundary between the model summary and the selectable
  // landing rows. Every non-blank row below it must be cursor-shaped; unknown extra UI fails closed.
  let search = -1;
  for (let i = title + 1; i < tail; i++) {
    if (texts[i]!.trim() === ">") search = i;
  }
  if (search < 0) return null;
  const rows = parseRows(texts, search + 1, tail);
  if (rows === null) return null;
  const options = rowOptions(rows);
  if (options.length === 0) return null;

  return {
    startLine: rows[0]!.line,
    model: {
      question: TITLE,
      options,
      family: "select",
      coreSignature: signed,
      signature: signed,
    },
  };
}
