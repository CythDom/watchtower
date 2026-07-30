# Iron×Iron — Roadmap

This is a living document. It captures the phased development plan, the reasoning behind phase ordering, and what is deliberately out of scope at each stage.

The roadmap follows the principle: **ship the smallest thing that embodies the mission. Expand from there.**

---

## Phase 0 — Foundation *(current)*

**Goal:** Establish the project structure, philosophy, and architectural foundations before writing any product code.

**Deliverables:**
- [x] Repository initialization
- [x] Core documentation (vision, philosophy, architecture, roadmap, UI principles)
- [ ] Technology stack decision
- [ ] Development environment setup
- [ ] Design token system and base component library
- [ ] Authentication scaffold
- [ ] Routing structure mirroring the domain map

**Why first:** Getting the foundation wrong is expensive. Getting the philosophy documented before writing code means every later decision has a reference point.

---

## Phase 1 — Watchtower MVP

**Goal:** A working daily briefing that a real user can use every morning.

**Scope:**
- Daily briefing homepage with greeting and item count
- Prioritized items: Critical / Worth Knowing / Curiosity
- Reading time estimate
- Item detail view with source link and AI-guided highlights
- Completion state ("You are up to date. Go build.")
- Basic user preferences (technology domains to monitor)
- Manual domain/source configuration (no algorithmic onboarding yet)

**Out of scope for Phase 1:**
- Personalization beyond explicit configuration
- Research or Forge features
- Any community features
- Native mobile

**Success criteria:**
- A user can open the app, read their briefing in under 15 minutes, and feel genuinely up to date
- The completion state is clearly reached and clearly communicated
- No infinite scroll. No "load more."

---

## Phase 2 — Research

**Goal:** Enable deep learning sessions when the Watchtower surfaces something worth exploring.

**Scope:**
- Full-text search across curated sources
- AI-guided reading: keystone ideas, concept maps, source suggestions
- Save resources to Forge workspace
- Reading history and notes per resource

**Integration with Watchtower:**
- Briefing items link directly into Research sessions
- "Go deeper" from a Watchtower item opens a guided Research session

**Out of scope for Phase 2:**
- Advanced Forge features (project management, blueprint library)
- Community features

---

## Phase 3 — The Forge

**Goal:** Give users a serious personal workspace for the work that learning is meant to support.

**Scope:**
- Projects with associated resources, notes, and saved research
- Blueprint library: personal implementation patterns
- AI coding assistance within project context
- Export and portability

**Why here:** The Forge is the *purpose* of Watchtower and Research. But it requires those features to be mature before the Forge has enough to link to.

---

## Phase 4 — Personalization and Radar

**Goal:** Make Watchtower genuinely personalized rather than manually configured.

**Scope:**
- Technology radar: user-defined tracking of specific technologies across quadrants (adopt / trial / assess / hold)
- Implicit signal learning from reading behavior (with transparency)
- Smarter prioritization: what is Critical vs. Worth Knowing vs. Curiosity
- Domain trend analysis over time

**Why deferred:** Personalization done poorly creates filter bubbles and engagement traps. We build the explicit, transparent version first, then add implicit learning once we understand how users actually use the explicit controls.

---

## Phase 5 — Blacksmith's Hall *(community)*

**Goal:** Enable genuine knowledge sharing without the pathologies of social media.

**Scope:**
- Discussion threads anchored to real implementations, blueprints, or research
- Blueprint sharing: community-contributed implementation patterns with source
- Quality surfacing: upvoting, but not algorithmically amplified
- Contributions link to your Forge profile, not a follower count

**Architectural note:** Blacksmith's Hall is a separate module from day one. Community dynamics should never bleed into Watchtower, Research, or Forge behavior.

**What it deliberately avoids:**
- Follower counts
- Algorithmic feed
- Engagement notifications
- Gamification of contribution counts
- Trending content based on engagement rather than quality

---

## Perpetually Out of Scope

These are not future phases. They will not be built:

- **Advertising** — full stop
- **Behavioral data monetization** — user data is not a product
- **Engagement-optimized notifications** — users are not targets
- **Infinite feed** — anywhere in the product
- **Social graph** — Iron×Iron is not a network; it is a workshop
- **AI that replaces reading** — it guides it

---

## Version Numbering Philosophy

- v0.x — foundation and internal tooling
- v1.x — Watchtower (Phases 1)
- v2.x — Research (Phase 2)
- v3.x — Forge (Phase 3)
- v4.x — Personalization (Phase 4)
- v5.x — Community (Phase 5)

Breaking changes happen at major versions. Minor versions add capability. Patches fix without adding scope.

---

*The roadmap is a tool for focus, not a commitment to a fixed future. Every phase can be revised. The mission cannot.*
