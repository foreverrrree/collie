# GJC model-picker choreography

Live-probed on 2026-08-31 against `gjc v0.15.6` in a disposable tmux pane at 100×65 and 180×90.
The captures in `web/src/fixtures/panes/gjc--*.txt` are cropped contiguous terminal regions from
that probe; no account identifiers or credentials are present.

## Composer

The idle composer is a rounded box at the buffer tail. Its first body row starts with `│ >`; wrapped
draft rows remain inside the same box, and the small right-hand logo may trail the final body and
bottom-border rows. `Ctrl+C` cleared a draft without submitting it. The draft fixtures were typed but
never sent.

## Ctrl+L model picker

The installed source at
`@gajae-code/coding-agent/src/modes/components/model-selector.ts` and the live pane agree on the input
recipe:

- Up/Down move the cursor and wrap across the physical landing rows.
- Right expands a selected top-level preset group; Left collapses it.
- Enter selects a child profile or activates an action row such as `Browse all models`.
- An `Already saved as …` row is cursor-addressable but Enter is deliberately a no-op.
- The preview prints its own final recipe: `Press Enter to apply or d to set as default`.
- Escape closes or backs out of the current picker layer.

The Collie adapter therefore computes only Up/Down navigation from the captured pointer, ends a
top-level marked group plan with Right, ends other actionable rows with Enter, and omits the native
no-op row. Every tap is still guarded by the exact signed terminal region before any key is sent.
