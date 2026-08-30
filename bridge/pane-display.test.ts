import { describe, expect, test } from "bun:test";

import { neutralizeCodexComposerBackground } from "./pane-display.ts";

const BG = "\x1b[48;2;240;240;240m";
const RESET = "\x1b[0m";

function composer(prefix = "transcript\r"): string {
  return [
    prefix,
    `${RESET}${BG}                              ${RESET}\r`,
    `${RESET}\x1b[1m${BG}›${RESET}${BG} ${RESET}\x1b[2m${BG}Ask Codex to do anything${RESET}\r`,
    `${RESET}${BG}                              ${RESET}\r`,
    `  ${RESET}\x1b[38;2;117;181;220mgpt-5.6-sol high${RESET}\x1b[2m · ${RESET}\x1b[38;2;150;204;127m~${RESET}\x1b[2m · ${RESET}\x1b[38;2;226;210;135mContext 29% used${RESET}\x1b[2m · weekly 90% left${RESET}`,
  ].join("\n");
}

describe("neutralizeCodexComposerBackground", () => {
  test("removes the painted composer background while preserving its text and foreground ANSI", () => {
    const input = composer();
    const output = neutralizeCodexComposerBackground(input);

    expect(output).not.toContain(BG);
    expect(output).toContain("\x1b[1m›");
    expect(output).toContain("Ask Codex to do anything");
    expect(output).toContain("\x1b[38;2;117;181;220mgpt-5.6-sol high");
    expect(output.split("\n")).toHaveLength(input.split("\n").length);
  });

  test("does not touch the same background in transcript content", () => {
    const transcript = `${BG}keep this transcript paint${RESET}\r`;
    const output = neutralizeCodexComposerBackground(composer(transcript));
    expect(output).toStartWith(transcript);
  });

  test("is a no-op when the composer shape is not at the tail", () => {
    const input = `${composer()}\nnew terminal output`;
    expect(neutralizeCodexComposerBackground(input)).toBe(input);
  });

  test("is a no-op for unrelated painted rows", () => {
    const input = [
      `${BG}                              ${RESET}\r`,
      `${BG}› not a live composer${RESET}\r`,
      `${BG}                              ${RESET}\r`,
      "ordinary status",
    ].join("\n");
    expect(neutralizeCodexComposerBackground(input)).toBe(input);
  });
});
