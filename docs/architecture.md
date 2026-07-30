# Iron×Iron — Architecture

This document captures the technical architecture of Iron×Iron and the reasoning behind key decisions. The goal is not just to describe *what* we built, but *why* — so future contributors understand the constraints and intentions, not just the structure.

---

## Guiding Principles

Before any framework was chosen, three architectural principles were established:

**1. The mission drives the architecture.**
Every technical decision should make it easier to leave users more capable, not harder. If a technology choice introduces complexity that doesn't serve users, it's probably wrong.

**2. Modularity from day one.**
Iron×Iron will grow. The Watchtower of v1 is the first room in a larger building. The architecture must allow new areas (Research, Forge, Blacksmith's Hall) to be added without rebuilding the foundation.

**3. Maintainability over cleverness.**
Future contributors — including future versions of us — should be able to understand why things are the way they are. Clever solutions that require archaeology to understand are technical debt.

---

## Current Scope (v1 — Watchtower)

v1 is deliberately small. The architecture supports:

- A daily, personalized intelligence briefing
- A research search-and-read experience
- A personal workspace (Forge)

It does **not** yet include:
- Community/social features
- Real-time collaboration
- Complex notification systems
- External user data sharing

The constraint is intentional. Build the foundation right, then expand.

---

## High-Level Structure

```
iron-x-iron/
├── apps/
│   └── web/              # Primary web application
├── packages/
│   ├── ui/               # Shared component library
│   ├── core/             # Domain logic, types, utilities
│   └── ai/               # AI integration layer
├── services/
│   ├── watchtower/       # Briefing generation and personalization
│   ├── research/         # Search and content retrieval
│   └── forge/            # Workspace data management
└── docs/
```

*Note: This structure is a target architecture. The initial implementation may be more consolidated. The separation is documented here so it's clear where things belong as the codebase grows.*

---

## Domain Areas and Boundaries

Each major product area has a defined domain with clear responsibilities:

### Watchtower
**Responsibility:** Generate and serve the daily intelligence briefing.
- Ingests signals from monitored technology domains
- Applies personalization based on user-defined radar
- Classifies items by priority (Critical / Worth Knowing / Curiosity)
- Delivers a bounded, time-estimated reading list
- Tracks completion state ("You are up to date")

**Key invariant:** The briefing is always finite. There is no "load more." The day's briefing is the day's briefing.

### Research
**Responsibility:** Enable deep learning sessions on specific topics.
- Full-text search across curated sources
- AI-guided reading: keystone identification, concept connection, source suggestions
- Save and organize resources to the Forge
- Never summarize away the need to actually read

**Key invariant:** AI assistance guides toward the source, not away from it.

### Forge
**Responsibility:** Serve as the user's personal workspace.
- Projects with associated notes, resources, and blueprints
- Saved research linked to projects
- Future: AI coding assistance, experimentation environment

**Key invariant:** The Forge is local-first in spirit. User data is theirs.

### Blacksmith's Hall *(future)*
**Responsibility:** Community knowledge sharing.
- Discussions grounded in real implementations
- Blueprint sharing with source code
- No feed optimization; quality surfacing over recency

*Architecture note:* This module requires the most careful design because community features carry the highest risk of drifting away from the mission. It should be isolated as its own service from the start so that decisions here don't pollute the rest of the system.

---

## AI Integration Layer

The AI layer is intentionally abstracted behind an interface. Rationale:

1. The AI provider landscape is changing rapidly. Coupling directly to any one provider creates fragility.
2. The behavior we want from AI (mentor, not replacement) is easier to enforce at a layer boundary.
3. Testing AI-dependent features is easier with a clean interface.

The AI layer exposes:
- `guideBriefingItem(item)` — produce keystone highlights for a briefing entry
- `suggestRelatedSources(topic)` — return primary sources, not summaries
- `explainConcept(concept, context)` — explain with the goal of promoting understanding
- `generateForgeAssistance(context)` — coding and project assistance

What the AI layer does **not** expose:
- `summarizeEverything(article)` — we guide, we don't digest
- `replaceReading(url)` — users should read; AI helps them do it better

---

## Data Architecture

### User Data
- User profiles and preferences are owned by the user
- Personalization data (radar configuration, read history) stays close to the user, not in centralized analytics pipelines
- No behavioral data sold or shared for advertising

### Content
- Watchtower content is fetched from external sources, processed, and stored transiently
- Research content is indexed but the canonical source is always referenced, not copied wholesale
- Forge data is user-owned and should be exportable

---

## Extensibility Decisions

Several decisions were made to keep future areas clean:

**Routing:** Top-level routes map directly to product areas (`/watchtower`, `/research`, `/forge`, `/hall`). This makes the navigation structure self-documenting and allows areas to be feature-flagged independently.

**Authentication:** Auth is designed to be area-agnostic. Any new area gets auth for free without changes to auth code.

**AI provider:** The AI interface layer means switching providers (or using multiple) requires changes in one place.

**Theming:** The visual design system is defined in one place (tokens/variables), not scattered across components. The forge aesthetic can evolve without a global refactor.

---

## Decisions Deferred

The following decisions are deliberately not made yet:

- **Database choice** — depends on deployment model and scale requirements
- **Mobile application** — architecture is designed to support a native mobile client but doesn't mandate one
- **Real-time features** — the infrastructure (WebSockets, SSE) is not built until real-time features are planned
- **Self-hosting** — the system should be self-hostable in principle but that's not an active constraint yet

---

## Architectural Non-Negotiables

These are not up for debate as the project grows:

1. **No dark patterns.** No re-engagement mechanics, notification spam, or attention traps embedded in the system architecture.
2. **User data portability.** Users can export everything they own.
3. **AI transparency.** AI-generated content is labeled. AI guidance is distinguishable from editorial decisions.
4. **Module isolation.** Blacksmith's Hall (community) is architecturally isolated from the rest of the system. Community dynamics should not be able to infect the core experience.

---

*Architecture should express values, not just structure. These decisions are the structure that embodies the mission.*
