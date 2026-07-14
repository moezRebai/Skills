# deck-from-template

Interview-driven PowerPoint builder. It runs a guided **grill / brainstorm** interview to
pull the content out of you one question at a time, converges on an approved **blueprint**,
then builds the deck **on your internal template** — keeping one cover + agenda + the
content pages it needs, adjusting their text, and deleting everything unused.

The full behaviour lives in `SKILL.md`; this README is just install + operation on Windows.

## Folder layout

This skill is **self-contained** — it bundles its own scripts under `scripts/`, so it does
not depend on any other skill. Drop it anywhere in your workspace `skills\` folder:

```
skills\
└── deck-from-template\
    ├── SKILL.md
    ├── setup.bat
    ├── README.md
    ├── references\
    ├── scripts\             <- bundled: deck.py (list/duplicate/keep), validate_pptx.py
    └── assets\
        └── template.pptx    <- the default template (placeholder for now)
```

## Install (Windows, no admin required)

You already have **Python** (installed by IT) and **PowerPoint** — that's all the skill
needs. Run **`setup.bat`** (no admin, no elevation). It:

1. checks Python is on the PATH;
2. `pip install --user`s the Python deps into your profile — `markitdown[pptx]`,
   `defusedxml`, `lxml`, `Pillow`;
3. checks the bundled `scripts\` are present (they ship with the skill);
4. confirms the rest: **visual QA is done by opening the deck in your PowerPoint**, so
   LibreOffice/Poppler are **not required**.

That's it — no admin, no LibreOffice, no Poppler for normal use.

> If the `markitdown` command isn't found after a `--user` install, either call it as
> `python -m markitdown` or add your user Scripts folder (shown by
> `python -m site --user-site`, sibling `Scripts\`) to your **user** PATH — no admin needed.

### Optional: let the agent render slides itself

Only needed for **unattended** runs where no human is at Gate 2 to open PowerPoint. Without
admin: download **LibreOffice Portable** (self-contained folder) and **Poppler** (zip of
binaries), then add each to your **user** PATH with `setx` (no elevation):

```bat
setx PATH "%PATH%;C:\path\to\LibreOfficePortable\App\libreoffice\program"
setx PATH "%PATH%;C:\path\to\poppler-xx\Library\bin"
```

Open a new terminal afterwards. The agent will then auto-render for its own visual QA;
otherwise it just hands you the file to open in PowerPoint.

## Use it

Invoke the skill on a topic, e.g. *"Make a deck from our template to pitch X to Y."* Then:

1. **Interview (Phase 1)** — it picks a mode (grill / brainstorm / brain-dump), asks one
   question at a time, and fills in a blueprint. The template is **not** touched here.
2. **Gate 1** — it shows the full blueprint; nothing is built until you approve it.
3. **Build (Phase 2)** — it inventories the template's pages (from the `markitdown` text
   dump; the visual grid is skipped if LibreOffice isn't there), keeps one cover + agenda +
   the content pages that fit, adjusts their content, deletes the rest, and runs the
   automated Python QA (`scripts\validate_pptx.py` + content grep).
4. **Gate 2** — it hands you `out.pptx`; **open it in your PowerPoint** to eyeball before
   it's declared done.

You can run interviews and iterate on blueprints **before** the real template is in place —
the template only matters at build time.

## Swapping in your real template

The default `assets\template.pptx` is a neutral **placeholder** so the skill works out of
the box. To use your real one:

```bat
copy /Y "C:\path\to\your-brand-template.pptx" "%CD%\assets\template.pptx"
```

- **Keep the exact filename `template.pptx`.** No repackaging needed — the skill reads the
  folder directly.
- To use a *different* template just for one deck without replacing the default, tell the
  skill the path when you start; it only falls back to `assets\template.pptx` otherwise.
- If you swap the template **mid-session** after the inventory step already ran, re-run the
  inventory so the page mapping reflects the real pages, not the placeholder's.

Your real template should carry the example pages the build selects from — cover variant(s)
with title + brand photo, agenda, and content pages (icon-content, timeline, chart,
two-column, closing, …). The placeholder mirrors that structure so you can see the shape.

## Windows notes

- **No admin needed.** Python (via IT) + PowerPoint cover everything; deps install with
  `pip install --user`.
- **No `zip` command needed.** The build packs the deck with Python
  (`python -m zipfile -c out.pptx unpacked/.`), so it works on stock Windows.
- **Visual QA = your PowerPoint.** The generate + validate path is pure Python; only the
  *optional* agent-side image render needs LibreOffice + Poppler.
- Paths in the reference docs use `/`; Python accepts them on Windows, but if you type a
  command by hand in `cmd`, use `\`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `markitdown` not found | Use `python -m markitdown`, or add your `--user` Scripts dir to user PATH |
| `python-pptx` missing | `python -m pip install --user python-pptx` (used by validate_pptx.py) |
| Built deck won't open | Run `python scripts\validate_pptx.py out.pptx`; fix what it names |
| Want agent auto-render | Add portable LibreOffice `\program` and Poppler `\Library\bin` to user PATH (`setx`) — optional |
