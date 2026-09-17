# Demo pack

One HTML page that presents the approved design to stakeholders: management, the business, operations, security and other teams. It is a presentation of decisions already made, not a place to make new ones.

## Contents
1. Ask about the audience
2. Content rules
3. Page structure
4. Drawing diagrams in SVG
5. Interactivity and accessibility
6. Build and check

## 1. Ask about the audience

One question (single choice) before building:
- **Mixed audience (Recommended)** — overview first, technical detail one click away
- **Business and management** — outcomes, risks, roadmap; little technology
- **Technical teams** — containers, deployment, flows, decisions in depth

Adjust depth, not truth: every audience sees the same decisions and risks.

## 2. Content rules

- **Approved content only.** Every fact comes from an approved document or ADR. If drawing reveals a gap or a contradiction, stop and raise it instead of fixing it silently in the picture.
- **Same names as the documents.** A component has one name everywhere.
- **No secrets, internal host names, IPs or account names.** Use the placeholders already in the documents.
- **Classification banner** at the top, taken from the document headers (default "Internal – Confidential").
- **Plain language first.** Each section opens with one or two sentences a non-specialist can follow; details go in the side panel.
- **Show the trade-offs.** Include accepted risks and open items; a demo that hides them misleads.

## 3. Page structure

Start from `assets/templates/architecture-overview.html`. Keep the sections that apply; drop the rest.

| Section | Source | What to show |
|---|---|---|
| Summary (hero) | `04` containers, `02` drivers | One-sentence purpose, the container diagram as the main visual, 3–4 key figures (latency, availability, load) |
| Context | `04` context | Users and external systems around the system |
| Deployment | `06` topology | Sites, hosts or clusters, load balancing, data replicas |
| Key flows | `04` runtime scenarios | 2–4 flows as numbered steps (a flow is a sequence, so numbering fits) |
| Decisions | ADR index | Each ADR: title, one-line decision, status; superseded ones visibly marked |
| Quality targets | `02` NFRs, `07` SLOs | Target, how it is met, how it is measured |
| Security | `05` | Trust boundaries and the main controls |
| Operations | `07` operating model | Who watches, how alerts reach people, escalation, reviews |
| Roadmap | `08` transition plan | Phases on a timeline with entry/exit highlights |
| Risks and open items | `09` review, `_session.md` | Accepted risks with owners; open questions; assumptions to validate |

Feature mode: the same page scoped to the feature. Draw the existing architecture in muted colors and the new or changed elements in full color, with a legend entry "New or changed".

## 4. Drawing diagrams in SVG

Draw diagrams as inline SVG written by hand. No diagram libraries, no external scripts, no images: the page must open offline and in locked-down browsers.

- **Grid:** use a `viewBox` (for example `0 0 960 480`), place boxes on a 20-unit grid, and keep 40+ units between boxes so arrows and labels have room.
- **Boxes:** `rect` with `rx="6"`; width 160–200, height 56–72. Two text lines at most: name, then technology in a smaller size. Text must fit; shorten rather than overflow.
- **Element types** (use the CSS classes in the template): `node-system` (our components), `node-ext` (external systems), `node-store` (databases, drawn with the cylinder path in the template), `node-person` (users, rounded pill), `zone` (dashed group for sites, networks or trust boundaries).
- **Flows as colored lines** with arrowheads from the template's `marker` definitions. Use one color per kind of flow and show a legend: data/prices, control/admin, external/security, telemetry. Label an arrow only when the label adds meaning, and keep labels short.
- **Size limits:** about 12 boxes per diagram. Split a busy diagram into two rather than shrinking text.
- **Routing:** prefer straight or right-angled paths (`path` with `H` and `V` commands); avoid lines crossing boxes.
- **Every clickable element** gets `data-id` matching an entry in the details data (section 5), plus `tabindex="0"`, `role="button"` and an `aria-label`.
- **Dark mode:** use only the CSS classes and variables from the template, never hard-coded colors in the SVG.

## 5. Interactivity and accessibility

The template already contains the small inline script. It provides:
- **Section navigation** in the side rail, with the current section highlighted.
- **A details panel:** clicking or pressing Enter on any element with `data-id` opens a side panel filled from the JSON block `<script type="application/json" id="details">`. Each entry has `title`, `summary`, optional `facts` (label/value pairs) and optional `refs` (document or ADR names).
- **Escape** closes the panel; focus returns to the element.
- **Print:** all sections print in order, the panel is hidden.

Keep it that way: no network requests, no storage, no external fonts or scripts. Respect reduced motion. Keep color contrast readable in light and dark themes, and never use color alone: flows also differ by line style in the legend.

## 6. Build and check

1. Copy the template to the output path and fill it section by section.
2. Fill the details JSON for every `data-id` used in the diagrams, and check that none is missing.
3. Check that the HTML is well formed and the JSON block parses.
4. Open the file in a browser if your environment allows; otherwise re-read each SVG and check coordinates so boxes do not overlap and text fits.
5. Re-check hygiene: classification banner, no secrets or host names, names match the documents.
6. Gate: show the user where the file is and ask **Approve**, **Revise**, or **Back to an earlier phase**. Tell them it can be opened directly from disk, and that sharing it follows the same classification as the documents.
