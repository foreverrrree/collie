import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseAnsi } from "../ansi";
import { lineText, splitLines } from "../blocks";
import { describeAdapterConformance } from "./conformance";
import { gjcAdapter } from "./gjc";
import { composerPrompt, extractInputDraft, hasComposer } from "./gjc/chrome";
import { detectGjcModelMenu } from "./gjc/model-menu";

const PANES_DIR = join(import.meta.dirname, "..", "..", "fixtures", "panes");

function fixtureLines(name: string) {
  return splitLines(parseAnsi(readFileSync(join(PANES_DIR, name), "utf8")));
}

function model(name: string) {
  const result = detectGjcModelMenu(fixtureLines(name));
  expect(result).not.toBeNull();
  return result!.model;
}

describe("GJC composer", () => {
  it("recognises the idle tail without treating its placeholder as a draft", () => {
    const lines = fixtureLines("gjc--fresh-idle.txt");
    expect(hasComposer(lines)).toBe(true);
    expect(extractInputDraft(lines)).toBeNull();
    expect(composerPrompt(lines)).toContain("Type your message...");
  });

  it("rejoins the real soft-wrapped draft for reply verification", () => {
    const lines = fixtureLines("gjc--draft-wrapped.txt");
    expect(extractInputDraft(lines)).toBe(
      "this is a deliberately long collie probe draft that should wrap across more than one line " +
        "without being submitted to any model and contains enough words to cross the box width safely",
    );
  });

  it("refuses the composer while the model picker owns the keyboard", () => {
    expect(hasComposer(fixtureLines("gjc--menu-model.txt"))).toBe(false);
    expect(composerPrompt(fixtureLines("gjc--menu-model.txt"))).toBeNull();
  });
});

describe("GJC model picker", () => {
  it("turns landing rows into direct tap plans relative to the live pointer", () => {
    const prompt = model("gjc--menu-model.txt");
    expect(prompt.question).toBe("Model presets");
    expect(prompt.options.find((option) => option.label === "✓ CODEX")?.keys).toEqual(["Right"]);
    expect(prompt.options.find((option) => option.label === "✓ OPENCODEGO")?.keys).toEqual([
      "Down",
      "Right",
    ]);
    // The cursor wraps, and the native no-op row still participates in its physical row count.
    expect(prompt.options.find((option) => option.label === "Browse all models")?.keys).toEqual([
      "Up",
      "Enter",
    ]);
    expect(prompt.options.some((option) => option.label.startsWith("Already saved as"))).toBe(false);
  });

  it("selects an expanded child with Enter rather than treating it as a provider group", () => {
    const prompt = model("gjc--menu-model-expanded.txt");
    expect(prompt.options.find((option) => option.label === "✓ Codex Eco")?.keys).toEqual([
      "Down",
      "Enter",
    ]);
  });

  it("uses exactly the Enter/d recipe printed by the preview", () => {
    const prompt = model("gjc--menu-model-preview.txt");
    expect(prompt.question).toBe("Preset preview: Codex Eco");
    expect(prompt.options).toEqual([
      { label: "Apply", keys: ["Enter"], keyLabel: "↵" },
      { label: "Set as default", keys: ["d"], keyLabel: "d" },
    ]);
  });

  it("fails closed when ordinary output appears below the terminal rule", () => {
    const lines = fixtureLines("gjc--menu-model.txt");
    const extra = splitLines(parseAnsi("ordinary output\n"));
    expect(detectGjcModelMenu([...lines, ...extra])).toBeNull();
  });

  it("keeps the preamble raw and lifts only the actionable tail", () => {
    const blocks = gjcAdapter.buildBlocks(fixtureLines("gjc--menu-model.txt"));
    expect(blocks.map((block) => block.kind)).toEqual(["raw", "prompt-select"]);
    expect(blocks[0]!.lines.map(lineText).join("\n")).toContain("Current: preset");
  });

  it("marks GJC's labelled and cornered terminal-width rules only in its own display pipeline", () => {
    const blocks = gjcAdapter.buildBlocks(fixtureLines("gjc--fresh-idle.txt"));
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.kind).toBe("raw");
    expect(blocks[0]!.lines.filter((line) => line.noWrap)).toHaveLength(3);
  });
});

const ownFixtures = [
  "gjc--menu-model-expanded.txt",
  "gjc--menu-model-preview.txt",
  "gjc--menu-model.txt",
];
const foreignFixtures = readdirSync(PANES_DIR)
  .filter((name) => /^(agy|claude|codex|grok|omp)--.*\.txt$/.test(name))
  .sort();

describeAdapterConformance(gjcAdapter, {
  ownFixtures,
  foreignFixtures,
  neutralFixtures: ["gjc--fresh-idle.txt", "gjc--draft-wrapped.txt"],
});
