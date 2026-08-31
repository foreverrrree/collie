import type { Block, StyledLine } from "../../blocks";
import type { HarnessAdapter } from "../types";
import { composerPrompt, extractInputDraft, extractStatusLines, hasComposer } from "./chrome";
import { markGjcTerminalBorders } from "./display";
import { detectGjcModelMenu } from "./model-menu";

export function gjcBuildBlocks(lines: StyledLine[]): Block[] {
  const menu = detectGjcModelMenu(lines);
  const displayLines = markGjcTerminalBorders(lines);
  if (menu === null) return [{ kind: "raw", lines: displayLines }];

  const blocks: Block[] = [];
  if (menu.startLine > 0) {
    blocks.push({ kind: "raw", lines: displayLines.slice(0, menu.startLine) });
  }
  blocks.push({
    kind: "prompt-select",
    prompt: menu.model,
    lines: displayLines.slice(menu.startLine),
  });
  return blocks;
}

export const gjcAdapter: HarnessAdapter = {
  agent: "gjc",
  buildBlocks: gjcBuildBlocks,
  extractStatusLines,
  extractInputDraft,
  composerReady: hasComposer,
  composerPrompt,
};
