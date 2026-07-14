# Deck blueprint

The contract between the interview and the build. Fill the header during the opening frame,
the slide plan during the archetype questions. Show the whole thing for approval (Gate 1)
before building.

## Header

- **Working title:** ePricing Team — Monthly Report, July 2026
- **Template:** assets/template.pptx (bundled default)
- **Audience:** manager (direct report-up), recurring monthly cadence
- **Purpose / the ask:** inform — no decision required this month
- **Single takeaway:** Steady state across the team — nothing to escalate
- **Decision / action sought:** none; awareness only, plus visibility on a small watch list
- **Format:** ~6 slides · read-alone or lightly presented · standard internal formality
- **Evidence on hand:** all facts sourced directly from interview (squad composition, deliveries, risks). No external data/benchmarks needed.
- **Interview mode used:** grill

## Slide plan

| # | Working title | Purpose (why this slide exists) | Key content / message | Layout | Visual |
|---|---------------|--------------------------------|-----------------------|--------|--------|
| 1 | ePricing Team — Monthly Report, July 2026 | Cover | Team name + period | cover | brand photo |
| 2 | Agenda | Orient the audience | Team Organization · Achievements · Milestones · Watch List & Closing | agenda | |
| 3 | Team Organization | Show current squad structure and any changes | 4 squads: **EOS** (3 devs + 2 BAs, Paris/NY) owns IRS pricing engine, steady, handled a crash issue with Quant team. **OnyX** (2 devs + 1 BA) owns FX Option pricing engine, steady state. **Finch** (1 dev + 1 BA) owns FX Swap pricing engine, lower productivity than other squads, one dev leaving end of month replaced by a new dev starting August, prod monitoring gap. **Duplo** (2 devs + 1 intern + 0.5 BA) provides zero-coupon contribution curves by currency/perimeter (LT/ST) per desk feeding EOS/Finch/others pricing, not fully steady — no dedicated BA/project lead. | icon-content (4 items) | |
| 4 | Achievements | What got delivered this month | **EOS**: delivered new functionality; resolved crash issue (with Quant team). **OnyX**: delivered new functionality on FX Option pricing engine. **Finch**: delivered new functionality on FX Swap pricing engine (below squad-average productivity). **Duplo**: delivered new features on contribution curves. | icon-content (4 items) | |
| 5 | Milestone: TREP/EMA Library Migration | Flag the cross-team strategic initiative | Cross-team target to replace RFA and Momnet libraries with a single steady library built on .NET Core + EMA (LSEG/Refinitiv). Status: just kicked off. Target: delivered over the next few months. | big-number/timeline (single initiative) | |
| 6 | Watch List & Closing | Close on the steady-state message, surface what to keep an eye on | Overall: steady state, nothing to escalate. Watch list: (1) Finch — prod monitoring gap, BA to prioritize a morning check procedure; (2) Finch — dev departure end of July, replacement starts August, transition risk; (3) Duplo — no dedicated BA/project lead, potential delivery risk; (4) TREP/EMA migration — multi-month initiative just kicked off, to track. | closing | |

## Open questions / notes

- None outstanding — all content confirmed in interview.
