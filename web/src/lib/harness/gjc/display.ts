import { lineText, type StyledLine } from "../../blocks";
import { PURE_HORIZONTAL_RULE_GLYPH_CLASS } from "../../rule-glyphs";

// GJC draws terminal-width tool cards, a labelled status bar and a rounded composer with long rule
// flanks. In the wrapped mobile mirror those single terminal rows otherwise become several browser
// rows made almost entirely of `─`. Keep this broader visual rule inside the exact `gjc` adapter:
// other harnesses intentionally leave labelled borders wrappable because their embedded labels can
// carry important session context (blocks.test.ts pins that global contract).
const MIN_GJC_RULE_RUN = 20;
const LONG_GJC_RULE_RUN = new RegExp(
  `([${PURE_HORIZONTAL_RULE_GLYPH_CLASS}])\\1{${MIN_GJC_RULE_RUN - 1},}`,
);

export function markGjcTerminalBorders(lines: StyledLine[]): StyledLine[] {
  return lines.map((line) =>
    line.noWrap || !LONG_GJC_RULE_RUN.test(lineText(line)) ? line : { ...line, noWrap: true },
  );
}
