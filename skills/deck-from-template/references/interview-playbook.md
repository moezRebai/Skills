# Interview playbook

How to run the grill / brainstorm that produces the blueprint. This is the heart of the
skill — a deck is only as good as the thinking behind it, and the interview is where that
thinking happens.

## Contents
- [The one rule](#the-one-rule)
- [Modes](#modes)
- [The opening frame (every deck)](#the-opening-frame-every-deck)
- [Archetype question banks](#archetype-question-banks)
- [Grill-mode challenge patterns](#grill-mode-challenge-patterns)
- [Knowing when to stop](#knowing-when-to-stop)
- [Producing the blueprint](#producing-the-blueprint)

## The one rule

**Ask one question at a time.** Wait for the answer. Let it steer the next question.

A wall of ten questions gets ten shallow answers and defeats the purpose — the user could
have written the outline themselves. A single, well-aimed question the user can actually
sit with produces the specific detail that makes a slide worth showing. This mirrors a
spec-refinement brainstorm: short exchanges, adaptive follow-ups, momentum.

Practical form: keep each turn to a sentence or two of context plus **one** question.
Reflect the previous answer back in a few words so the user sees it landed, then ask the
next thing.

## Modes

Pick one in Phase 0; switch freely if the session's energy changes.

**grill** — the user roughly knows the deck; your job is to sharpen it. Be a constructive
skeptic. Challenge vague answers, hunt for the one takeaway, kill slides that don't earn
their place. Best for proposals, pitches, and decision decks where a real audience will
push back.

**brainstorm** — the user isn't sure what belongs. Be generative. Offer two or three angles
and let them react; propose a spine; suggest what a strong version of this deck usually
includes. You're widening the option space before narrowing it.

**brain-dump** — the user has the content and wants speed. Skip interrogation. Capture what
they dictate, ask only when something is genuinely missing (audience, the takeaway), then
read the whole thing back once as a blueprint for approval.

## The opening frame (every deck)

Resolve these *before* touching individual slides. They decide structure, length, and tone,
so getting them wrong wastes the rest of the interview. Ask them one at a time, in roughly
this order, skipping any the user already answered:

1. **Audience** — who is in the room, and what do they already know / believe? (A deck for
   your squad ≠ a deck for a steering committee.)
2. **Purpose / the ask** — what should change because of this deck? Inform, persuade,
   get a decision, teach, report status?
3. **The single takeaway** — if they remember one sentence a week later, what is it? If the
   user can't name it, that's the first thing to work out together.
4. **The decision or action sought** — what do you want the audience to *do* or approve? (No
   ask → it's a status deck; name that honestly.)
5. **Format constraints** — slot length / rough slide count, live-presented vs. read-alone,
   formality, any mandated sections.
6. **Evidence on hand** — what proof exists (data, a demo, benchmarks, a reference case),
   and what has to be sourced or is missing?

Capture the answers into the blueprint header as you go.

## Archetype question banks

Once the frame is set, identify the deck's archetype and pull from the matching bank. These
are prompts to draw from adaptively — **not** a checklist to fire off in sequence.

### Proposal / decision deck (strategy, investment, "should we do X")
- What's the problem or opportunity, stated so the audience feels it in one slide?
- What exactly are you proposing — scope it tightly enough to approve.
- Why now? What's the cost of doing nothing / waiting?
- What are the 1–2 credible alternatives, and why is yours better?
- What does it cost (money, people, time) and what's the expected return?
- What are the risks and how are they mitigated?
- What's the concrete ask on the closing slide, and who owns the next step?

### Technical design / architecture review
- What's the system's job, and what forces shape it (scale, latency, reliability targets)?
- What's the current state / pain being addressed?
- What's the proposed design at a diagram level — components and how they talk?
- Which decisions were contested, and what did you choose *and reject* (and why)?
- Where are the hard numbers (throughput, P99, footprint) and how were they measured?
- What are the failure modes, migration path, and rollout plan?
- What are you asking reviewers to actually sign off on?

### Status / progress update
- What's the goal this work rolls up to, in one line?
- Since last time: shipped, in-flight, blocked — the honest three.
- The one metric or milestone that best shows momentum?
- What's at risk, and what do you need from this audience to unblock it?
- What happens before the next update?

### Training / enablement / teaching
- Who's learning this, and what should they be able to *do* afterward?
- What's the smallest set of concepts that gets them there? (Resist covering everything.)
- Where do people usually get confused, and what example makes it click?
- Where's the hands-on moment or the "try it yourself"?
- How will they know they got it?

### POC / flagship pitch
- What's the demo in one sentence, and why does it matter to *this* audience?
- What did you actually build vs. what's aspirational — be clear about the line.
- What did you learn that you couldn't have known without building it?
- What would "green light" look like, and what's needed to get to the next stage?

## Grill-mode challenge patterns

When an answer is soft, push **once**, specifically, then move on. Patterns:

- **Generic benefit → whose, how much:** "You said it improves efficiency — for which team,
  and roughly how much, measured how?"
- **Solution with no problem:** "Before the how — what breaks today if we do nothing?"
- **Everything is important → force rank:** "If you could keep only three of these slides,
  which three?"
- **Buried ask:** "What do you want them to *approve* by the end? Say it as one sentence."
- **Unsupported claim:** "What's the evidence for that — data, a case, a demo? If none, do
  we soften it or cut it?"
- **Kitchen-sink deck:** "Who's the audience for this slide specifically? If it's not them,
  it goes in an appendix."

The goal is a tighter deck, not a interrogation. One good push per soft answer; if the user
holds their position with a reason, accept it and record it.

## Knowing when to stop

Stop interviewing and draft the blueprint when **you can state the purpose of every slide
without guessing**. Signs you're done: the takeaway is a crisp sentence, the ask is
explicit, each section has enough concrete content to fill a slide, and further questions
are only polishing. Over-interviewing is its own failure — respect the user's time.

## Producing the blueprint

Fill in `assets/blueprint.md`. It has two parts: a header (the frame answers) and a
slide-by-slide plan. For each slide record its working title, purpose, the actual key
content/message, a suggested template-layout *type* (title / section / one-column /
two-column / comparison / quote / data / closing), and any visual (chart, diagram, image,
screenshot).

Then present the whole blueprint in the chat and ask for explicit approval. Offer to adjust
order, merge/split slides, or cut anything that doesn't serve the takeaway. **Gate 1**: no
building until the user signs off.
