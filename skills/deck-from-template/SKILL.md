---
name: deck-from-template
description: >
  Interview-driven PowerPoint builder that turns a conversation into a finished deck
  rendered on an internal / brand template. Use this WHENEVER the user wants to create,
  build, draft, or "put together" a presentation, slide deck, or pitch on a company or
  internal template (.potx/.pptx) — especially when the content isn't fully worked out yet
  and they want to be asked what goes in it. Trigger on requests like "make a deck from our
  template", "build slides for X using the company template", "help me figure out what to
  put in a presentation and generate it", "interview me / grill me for a deck", or
  "brainstorm a deck with me". The skill runs a guided grill / brainstorm interview to
  elicit content one question at a time, converges on an approved blueprint, then builds the
  deck faithfully on the template's own layouts and QAs it. Use even when the template or
  the topic is only implied.
---

# deck-from-template

Turn a conversation into a finished, on-brand deck. Two phases with a human gate between
them:

1. **Interview** — a guided grill / brainstorm that pulls the content out of the user one
   question at a time and converges on an approved **blueprint** (a slide-by-slide plan).
2. **Build** — inventory the template's own layouts, map each blueprint slide onto the best
   layout, generate the deck by *editing the template* (never rebuilding it from scratch),
   and QA it.

The value of this skill is the discipline, not magic: don't skip the interview and don't
skip the template inventory. A deck built without either turns into generic bullets on the
wrong master.

## Configuration

- **Template — default is bundled.** The skill ships a default template at
  `assets/template.pptx` (relative to this skill's directory). Use it unless the user asks
  for a different one. Resolve `TEMPLATE` to that bundled file by default, and only override
  it with a user-supplied `.pptx` path.
- Everything else is discovered from the template at build time — never hardcode brand
  colors, fonts, or layout names.

## Phase 0 — Frame the session

Do this in the first reply, briefly.

1. **Confirm the topic, and the template.** Default to the bundled `assets/template.pptx`
   and say so in one line — e.g. "I'll build on the default template unless you'd rather I
   use another `.pptx`." Switch `TEMPLATE` only if the user names a different file. Either
   way the interview runs the same; the template only matters at build time.
2. **Pick an interview mode** and say which one you're using (offer to switch):
   - **grill** — sharpen a deck the user roughly has in mind. You play skeptic: challenge
     vague answers, demand the specific, protect against filler slides. Best for
     proposals, pitches, decision decks.
   - **brainstorm** — the user isn't sure what belongs yet. You're generative: offer
     angles, propose structures, suggest what a strong version would include.
   - **brain-dump** — the user already knows the content and just wants to dictate it fast.
     Skip interrogation; capture, then read it back once as a blueprint.
3. Then start Phase 1. **Do not** ask for the mode and the first content question in the
   same message — one thing at a time from here on.

## Phase 1 — Interview → blueprint

Read `references/interview-playbook.md` and run it. The non-negotiables:

- **One question at a time.** Ask, wait for the answer, let the answer shape the next
  question. Never paste a numbered list of 10 questions — that produces shallow answers and
  kills the point of the interview. (`brain-dump` mode is the only exception, and even then
  you read the result back as a single blueprint.)
- **Frame before content.** Nail audience, purpose, the single takeaway, and the decision
  the deck should drive *before* asking about individual slides. Everything downstream
  hangs on these.
- **In grill mode, refuse vagueness.** If an answer is generic ("we'll cover the benefits"),
  push once for the concrete ("which benefit, for whom, backed by what?"). Don't nag — one
  good push per soft answer.
- **Converge, don't sprawl.** When you can already describe every slide's purpose, stop
  asking and draft.

Fill in `assets/blueprint.md` as you go and, when the interview is done, **show the full
blueprint** and ask for explicit sign-off.

> **GATE 1 (required):** Do not open the template or write any slide until the user approves
> the blueprint. Edits to the blueprint are cheap; edits to a built deck are not.

## Phase 2 — Build on the template

Read `references/template-and-build.md` and follow it. The shape of it:

1. **Inventory the template as a *menu*.** Dump its text with `markitdown` and list its
   slides with `scripts/deck.py list`. These templates ship *alternatives* — several
   cover/title variants to choose between, plus a catalogue of content page types (agenda,
   title + content with icons, timeline, two-column, quote, closing). Catalog them by group.
2. **Choose the spine.** Pick the exact example slide for each position: keep the **one**
   cover variant that fits the brief (e.g. title + brand photo), the agenda, one content
   page type per section (matched to its shape), and the closing. The build is mostly
   *selection and deletion* — keep one, drop the alternates — not duplication.
3. **Build by editing the template**, not a from-scratch generator: unpack, then use the
   **bundled `scripts/deck.py`** — `deck.py duplicate` to copy a page type when a section
   needs a second copy, and `deck.py keep --order …` to set the final slide order and delete
   every unused example in one step — then fill each remaining slide's XML and repack with
   `python -m zipfile`. All scripts ship with this skill (`scripts/`); no external skill and
   no LibreOffice needed. Do not reproduce the brand template with `pptxgenjs`.
4. **QA.** Required automated checks are pure Python (no LibreOffice / no admin):
   `scripts/validate_pptx.py out.pptx` plus a content dump + placeholder grep. Visual QA
   defaults to the user's PowerPoint (an agent-side image render is optional, only if
   LibreOffice is
   available).

> **GATE 2 (required):** Hand the user the finished `out.pptx` to open in PowerPoint (or
> show an image render if one was produced) and confirm before declaring done. Fix the usual
> first-pass issues (overflow, leftover placeholder text, a title underline sized for one
> line that now wraps to two) before this gate, not after.

## Principles

- **The template is the boss.** Inherit its colors, fonts, masters, and bullet styles. If
  the blueprint wants something the template can't express cleanly, note it at Gate 1 rather
  than fighting the master.
- **Template slots ≠ content items.** If a layout shows four cards and the section has
  three, delete the fourth group entirely (visuals included), don't just blank its text.
- **File-based handoff.** The blueprint is the contract between the two phases; keep it on
  disk so the build is reproducible and the user can edit it directly.
- **No invented facts.** Every number, quote, or claim on a slide comes from the interview.
  If something's missing, that's a question, not a guess.
