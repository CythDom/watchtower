# Iron×Iron

> *Iron sharpens iron.*

Technology should leave people more capable than it found them.

Iron×Iron is a personal knowledge ecosystem built for engineers, creators, and thinkers who want to stay genuinely sharp in the age of AI — not merely informed.

---

## Mission

Most technology today optimizes for attention. Iron×Iron optimizes for capability.

The goal is not to maximize engagement, screen time, or content consumption. The goal is to help users:

- **Learn continuously** — not reactively
- **Stay ahead of meaningful change** — not noise
- **Think deeply** — not skim endlessly
- **Build more** — not read forever
- **Share knowledge** — and sharpen one another

Every feature answers one question: *Does this leave the user more capable than before?*

---

## Philosophy

The name comes from a proverb: *iron sharpens iron*. One person sharpens another through honest engagement, shared knowledge, and mutual effort.

The app should feel like a quiet workshop or library — not a social media platform.

We deliberately reject:
- Infinite scrolling
- Engagement metrics
- Notification spam
- AI that replaces thinking
- Fear of missing out

We deliberately embrace:
- Craftsmanship
- Curiosity
- Competence
- Deep understanding
- Quiet focus
- Creation and teaching

→ See [`docs/philosophy.md`](docs/philosophy.md) for the full statement.

---

## Current Version — Watchtower (v1)

Version 1 is a personal **Watchtower**: a calm, daily briefing that answers *"What should I know today?"*

The homepage greets you:

```
Good morning.
The horizon has changed.

Today's sharpening:
  • 2 Critical
  • 3 Worth Knowing
  • 1 Curiosity

Estimated reading: 12 minutes.

Begin.
```

When you finish:

```
Today's sharpening is complete.
You are up to date.

Go build something.
```

The ideal session is 10–15 minutes. The app should confidently tell you when you are done.

### v1 Pages

| Page | Purpose |
|------|---------|
| **Watchtower** | Daily personalized updates — the heart of v1 |
| **Research** | Search, browse, save, and read with AI-guided depth |
| **Forge** | Personal workspace: projects, notes, saved resources |

No social features in v1. No community. No feeds.

---

## Long-Term Vision

Iron×Iron is designed to grow into a full personal knowledge ecosystem:

- **Watchtower** — personalized technology radar and daily briefing
- **Research** — deep learning, papers, articles, blueprints
- **The Forge** — project workspaces with AI assistance and experimentation
- **Blacksmith's Hall** *(future)* — community knowledge sharing, implementations, collaborative learning
- **Blueprint Library** *(future)* — curated implementation patterns

The architecture is designed so these areas can evolve naturally. See [`docs/architecture.md`](docs/architecture.md) and [`docs/roadmap.md`](docs/roadmap.md).

---

## Project Structure

```
iron-x-iron/
├── docs/
│   ├── vision.md          # The long-term product vision
│   ├── philosophy.md      # Core design and product philosophy
│   ├── architecture.md    # Technical architecture and decisions
│   ├── roadmap.md         # Phased development roadmap
│   └── ui-principles.md   # Visual and interaction design principles
├── src/                   # Application source (TBD by stack decision)
├── CONTRIBUTING.md        # How to contribute
├── LICENSE                # MIT License
└── README.md              # This file
```

---

## Development Goals

1. **Foundation first.** Clean architecture that supports future expansion without being over-engineered for it.
2. **Philosophy-driven.** Every feature earns its place by leaving users more capable.
3. **Maintainable by default.** Code and decisions are documented so contributors understand the *why*, not just the *what*.
4. **Iterative.** Ship the smallest thing that embodies the mission. Expand from there.

---

## License

MIT — see [`LICENSE`](LICENSE).

---

*Build something worth building. Sharpen one another.*
