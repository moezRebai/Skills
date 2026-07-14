# Template inventory & build

Phase 2: turn the approved blueprint into a deck that looks like it was made *in* the
template. All the OOXML mechanics are **bundled in this skill's `scripts/`** — no external
skill and no LibreOffice needed. Paths below are relative to the skill directory.

## Step 1 — Inventory the template

You cannot map content onto pages you haven't looked at. `$TEMPLATE` defaults to the bundled
`assets/template.pptx` (or the user's file if they supplied one). Read its pages:

```bash
markitdown "$TEMPLATE"     # text + placeholder names per slide (pure Python, no LibreOffice)
```

(`$TEMPLATE` is a `.pptx`, so this runs directly. Only if it's a `.potx` do you first
`cp "$TEMPLATE" template.pptx` and point at the copy.) If a visual grid would help *and*
LibreOffice happens to be installed, you can render the whole template to images
(`soffice --headless --convert-to pdf "$TEMPLATE"` then `pdftoppm`), but that's optional —
`markitdown` is enough, and the bundled template labels each page `TEMPLATE PAGE · <type>`.

**Treat the template as a *catalogue of examples*, not a deck-in-progress.** It ships several
*alternative* cover/title variants to choose between, plus example pages for each content
shape — agenda, title + content with icons, timeline, chart, two-column, quote, closing —
often with reusable icons and pre-styled chart/timeline objects. The build is mostly
**selection and deletion**: keep the one example that fits each need, adjust its content,
drop everything unused.

Use `scripts/deck.py list` to see the current slide order and filenames:

```bash
python -m zipfile -e "$TEMPLATE" unpacked/       # unpack once
python scripts/deck.py list unpacked/            # slideN.xml <-> position mapping
```

Catalog by group: which `slideN.xml` is which cover variant, the agenda, each content type,
the closing. Note the brand's fonts/colors only to *respect* them — never hardcode.

## Step 2 — Choose the spine (which examples to keep)

Decide the exact example slide for every position in the final deck, in order. Default spine:

1. **Cover** — the **one** title example matching the brief (e.g. title + brand photo).
2. **Agenda** — its items come from the blueprint's section titles.
3. **Content** — for each blueprint section, the content page whose *shape* fits
   (icon-content for parallel points, timeline for a sequence, two-column for compare,
   big-number for one metric). Duplicate a type only when a section needs a second slide.
4. **Closing** — the closing / call-to-action example, carrying the blueprint's ask.

**Vary the page types**; match shape to content. Record the chosen `slideN.xml` next to each
blueprint row so the build is mechanical.

## Step 3 — Build: select, order, fill

Work on the `unpacked/` folder from Step 1. **Duplicate first, then select/reorder, then
fill** (duplicating copies a slide verbatim, so do it before editing text).

```bash
# (only if a section needs a second copy of a page type)
python scripts/deck.py duplicate unpacked/ slide7.xml --after slide9.xml

# keep exactly the spine, in order, and delete every other example slide in one step:
python scripts/deck.py keep unpacked/ --order slide1.xml,slide5.xml,slide7.xml,slide9.xml,slide13.xml

# now edit each remaining ppt/slides/slideN.xml to fill in blueprint content, then repack:
python -m zipfile -c out.pptx unpacked/.
```

`deck.py keep` rewrites `<p:sldIdLst>` to your order and removes the dropped slides
everywhere (part, rels, Content-Types override, presentation relationship) — that's the
"keep one, drop the rest" step. `duplicate` handles all the bookkeeping for a new slide.

If the template is unusually sparse (only layouts, no example slides), that's an edge case
these scripts don't cover — tell the user rather than guessing. Content-editing rules that
keep the deck openable and on-brand:

- **Never rebuild the brand deck from scratch** (e.g. `pptxgenjs`). That loses the master,
  theme, and layout geometry — the whole point of using their template. Always edit.
- **Template slots ≠ content items.** A page with four cards but three items → delete the
  fourth group *entirely* (its image and all its text boxes), not just its text. Check for
  orphaned visuals in QA.
- One `<a:p>` per list item; copy the sibling `<a:pPr>` to preserve spacing; `b="1"` on
  `<a:rPr>` for titles and inline labels (`Status:`, `Owner:`).
- Let bullets inherit from the page — only override with `<a:buChar>` / `<a:buAutoNum>` /
  `<a:buNone>`. Never type a literal bullet character.
- Leading/trailing spaces need `xml:space="preserve"` on the `<a:t>`.
- When editing slide XML in a script, parse with `defusedxml.minidom`, **not** `xml.etree`
  (etree rewrites namespace prefixes and corrupts the deck). For the `<p:sldIdLst>`
  specifically, edit it as text — minidom silently drops an unprefixed `id` on a prefixed
  element (`deck.py` already handles this for you).
- Don't invent data — charts/numbers come from the interview. To change chart values, edit
  the chart XML under `ppt/charts/`; to change a placeholder image, replace the media part
  it points to.

## Step 4 — QA

**Automated checks (required, pure Python — no LibreOffice, no admin):**

```bash
# structure + deep open test (well-formed parts, content-types, relationship graph, python-pptx open)
python scripts/validate_pptx.py out.pptx

# content: nothing missing, no leftover placeholder text
markitdown out.pptx
markitdown out.pptx | grep -iE "\bx{3,}\b|lorem|ipsum|\bTODO|\[insert|click to edit|this.*(page|slide).*layout"
```

`validate_pptx.py` needs `python-pptx` (installed by `setup.bat`) for its deep open test.
Reading the `markitdown` slide list, also confirm **no empty or unused example page
survived** — every slide should be one you deliberately kept and filled; a leftover cover
variant or blank example is a defect (re-run `deck.py keep` with the corrected order).

**Visual QA — default to the user's PowerPoint.** These templates are built for PowerPoint,
the ground-truth renderer, so at **Gate 2** hand the user `out.pptx` to open and eyeball —
nothing to install. Ask them to check first for text overflow / cut-off (the most common
defect), then overlaps and template decoration that shifted after text replacement (e.g. a
title underline sized for one line when the title wrapped to two).

**Optional agent-side render** — only for unattended runs, and only if LibreOffice + Poppler
are on PATH (e.g. a portable LibreOffice):

```bash
soffice --headless --convert-to pdf out.pptx
pdftoppm -jpeg -r 150 out.pdf slide     # then look at slide-*.jpg
```

Fix defects at the source and re-check only what changed, then **Gate 2**: confirm and deliver.
