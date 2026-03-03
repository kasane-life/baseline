# Baseline — User Feedback Log

Format: Date, tester, context, then raw feedback organized by area.

---

## 2026-03-02 — Mike Deal (brother)

**Context:** First external tester. Garmin user. Went through full flow on beta.mybaseline.health. Feedback given verbally to Andrew.

### Garmin Export
- "I'm having a helluva time trying to export garmin data"
- Can find per-day .fit files but not bulk health data
- No "Export" option on Health Stats page (instructions were wrong)
- Health & Fitness reports require per-metric export (Steps, Sleep, etc. separately)
- **Resolved:** Updated parser to handle per-metric Garmin CSVs, updated export guide

### Landing Page
- Font is hard to read on dark theme
- Too much scrolling / content heavy
- "Average is not healthy" / "health has a shelf life" — not as compelling
- Coverage score needs explanation
- Suggested reorder: start with hooks → explanation → "what do I do about it"
- "How do I know if I'm healthy?" is a key question / strong hook
- Need to translate landing page content into the product experience

### App (Phase 2)
- No back button — can't go back to edit values
- BP section needs more context/guidance
- Placeholder text needed on medication search input (already had one — may need to be more visible)

### Messaging
- "Data is everywhere but nowhere" — resonant, lean into this
- "No doctor dependency" and "on medical care" — worth exploring
- Coverage score concept needs better framing/explanation

---

## 2026-03-03 — D (friend)

**Context:** Verbal conversation with Andrew about the Baseline concept. Not a product walkthrough — more philosophical/framing discussion.

### Framing & Philosophy
- Wants to focus on health relative to **immediate circumstances**, not longevity — "longevity is separate"
- Tracking metrics introduces **high cognitive load and frustration** — the paradigm itself is a burden
- **"The map is not the terrain"** — metrics approximate health but don't equate to it
- Don't confuse measurement for the thing being measured

### Mental Model
- Health as a **plant with scaffolding**: orient and stabilize first, start growing, then the scaffolding comes off and you self-evolve
- Implies Baseline should be temporary structure, not a permanent dashboard
- Gen population data works as an **anchor with tunables** for the individual — validates the NHANES percentile approach

### Product Interest
- Possible interest in **cut tracker** — a concrete, immediate, "how do I feel now" use case
- Bridges gap between "immediate circumstances" preference and the tracking paradigm

### Implications for Product
- Results page may feel too definitive — could soften from "this is your health" to "this is what we can see"
- Onboarding/first-run should orient and stabilize, not overwhelm with 40 metrics
- The "scaffolding" metaphor aligns with coverage score: you're building the scaffold, not grading yourself
- Cut tracker could be a compelling entry point for users who resist the full health-mapping paradigm

---

## Template

```
## YYYY-MM-DD — Name (relationship/role)

**Context:** Device, how they tested, any setup notes.

### [Area]
- Raw feedback quote or paraphrase
- **Resolved:** if fixed, note what changed
```
