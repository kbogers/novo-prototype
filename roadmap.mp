# Novo Prototype roadmap

## Completed

- **Landing page (Mar 2025):** Static stack (`index.html`, `styles.css`, `app.js`) implementing Figma frames `41:1286` (patients) and `41:1350` (physicians). Audience switcher via tabs; typography/colors from design (Noto Sans, `#001a69`, `#dff1fb`). Image assets copied into `assets/` from Figma MCP URLs (time-limited remote URLs replaced for durability). `design-tokens.json` intentionally not wired in.
- **Step badges (Mar 2026):** “How it works” step markers are HTML (`span.step__badge` with 1–3) + CSS circles instead of PNGs (`step-1.png` … `step-3-phys.png`), keeping 42×42px and `aria-hidden` on the decorative number (list semantics stay on the `<ol>`).
- **Physician trial card icons (Mar 2026):** Google Material Symbols Outlined, one glyph per row by content (`water_drop`, `bloodtype`, `science`, `view_list`; NDec row uses `science` instead of `microscope` to avoid `mic`/microphone ligature clash) via fonts.googleapis.com instead of PNGs in the trial list.
- **Hero CTAs (Mar 2026):** Buttons in `.hero__copy` use `align-self: flex-start` so they size to their label and sit left-aligned with the copy column (flex column default was stretching them full width).
- **Hero titles (Mar 2026):** `.hero__title` uses `line-height: 1.2` instead of matching `font-size` 1:1 so wrapped headlines have comfortable vertical rhythm (desktop + tablet breakpoints).
- **Hero padding parity (Mar 2026):** Removed `.hero__inner--physician { align-items: center; }` so the physician hero uses the same top alignment as the patient hero (`flex-start` on `.hero__inner`); vertical centering had made the sky band look like extra padding.

## Decisions

- **Git / GitHub (Mar 2026):** Repository is scoped to this folder only (`git init` here), not the parent `Documents` tree. Remote: `https://github.com/kbogers/novo-prototype` (`main`). Added `.gitignore` for `.DS_Store`.
- Nav links scroll within the **active** panel only (`data-scroll-section` + `data-scroll-target`). Patient panel ends after “How it works” (no trials/FAQs placeholders). Physician panel still has FAQ placeholder below “How it works”.
- **Features (“How it works”):** Header and steps list are left-aligned within `features__inner` (not centered) for clearer reading flow.
