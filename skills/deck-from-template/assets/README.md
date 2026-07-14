# assets/

- **`template.pptx`** — the default template the skill builds on. A neutral **placeholder**
  ships here so the skill runs end-to-end out of the box; **replace it with the real
  internal `.pptx`, keeping the exact filename `template.pptx`**, and everything else keeps
  working. The skill resolves `TEMPLATE` to this file by default (see SKILL.md →
  Configuration) and only uses a different template when the user supplies one explicitly.
  The placeholder contains the example pages the build selects from: 4 cover variants (one
  with title + brand photo), agenda, section divider, icon-content, two-column, timeline,
  chart, KPI/big-number, quote, and closing — each labelled `TEMPLATE PAGE · <type>` in the
  corner so the inventory step can catalogue them.
- **`blueprint.md`** — the content-spec skeleton the interview fills in; not a template file.
