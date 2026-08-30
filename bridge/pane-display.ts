// Compatibility cleanup for terminal text sent to browser clients.
//
// Codex paints the three-row composer with an explicit light background. Collie's current web
// adapter removes the whole composer and presents its own native input, but an already-open PWA can
// keep an older bundle that removes only the prompt/status rows. That leaves Codex's painted blank
// top row behind; Collie's light-theme terminal inversion turns it into the solid black bar users
// see above the native composer. The bridge is the one component every old and new client polls, so
// neutralising only this redundant paint fixes stale clients immediately without hiding the prompt
// text that reply verification still needs.

const ANSI_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b[@-Z\\-_]/g;
const CODEX_COMPOSER_BG = "\x1b[48;2;240;240;240m";

function plain(line: string): string {
  return line.replace(ANSI_RE, "").replace(/\r$/, "");
}

function isStatus(line: string): boolean {
  const text = plain(line).replace(/\s+$/, "");
  return /^ {2}\S.* · .*Context \d+% (?:left|used)\b/.test(text);
}

/**
 * Remove only Codex's explicit RGB background from a composer at the live buffer tail.
 *
 * The text, foreground styles, line count, CRs and every non-composer background stay byte-for-byte
 * intact. If the exact three-row composer + status shape is not present, return the original string.
 */
export function neutralizeCodexComposerBackground(text: string): string {
  const lines = text.split("\n");
  if (lines.length < 4) return text;

  const status = lines.length - 1;
  const bottom = status - 1;
  const prompt = status - 2;
  const top = status - 3;
  if (
    !isStatus(lines[status]!) ||
    plain(lines[top]!).trim() !== "" ||
    !plain(lines[prompt]!).startsWith("› ") ||
    plain(lines[bottom]!).trim() !== "" ||
    ![top, prompt, bottom].some((i) => lines[i]!.includes(CODEX_COMPOSER_BG))
  ) {
    return text;
  }

  for (const i of [top, prompt, bottom]) {
    lines[i] = lines[i]!.replaceAll(CODEX_COMPOSER_BG, "");
  }
  return lines.join("\n");
}
