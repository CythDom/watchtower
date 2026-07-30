# Contributing to Iron×Iron

Thank you for your interest in contributing. Before you write a line of code, please read this document — especially the philosophy section. Iron×Iron is a mission-driven project, and contributions are evaluated against that mission first.

---

## The Question Every Contribution Must Answer

> **Does this leave the user more capable than before?**

If a feature, change, or optimization cannot answer yes to that question, it probably does not belong here. This applies to bug fixes, UX decisions, architectural choices, and new features alike.

---

## Philosophy First

Read [`docs/philosophy.md`](docs/philosophy.md) before contributing. This is not optional ceremony — it is the filter through which all product decisions pass.

Key commitments you are agreeing to uphold:
- No infinite scrolling
- No engagement optimization
- No notification spam
- No AI that replaces thinking
- No feature creep that dilutes focus

---

## How to Contribute

### Reporting Issues

Open a GitHub Issue with:
- A clear title
- What you expected vs. what happened
- Steps to reproduce (if a bug)
- Why fixing it supports the mission (if a feature request)

### Proposing Features

Before building anything substantial, open an issue or discussion first. Describe:
1. What the feature does
2. How it leaves users more capable
3. What it deliberately *does not* do (scope matters)

Iron×Iron favors thoughtful discussion before implementation for any significant design decision.

### Submitting Code

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Write or update tests as appropriate
5. Ensure code is clean, documented where non-obvious, and consistent with existing patterns
6. Open a pull request with a clear description of what changed and why

### Pull Request Standards

- **Title:** Concise imperative sentence (`Add daily briefing word count estimate`)
- **Description:** What changed, why it supports the mission, any tradeoffs made
- **Scope:** One logical change per PR — small and focused is better than large and comprehensive
- **Tests:** Include tests for new behavior where applicable
- **Docs:** Update relevant documentation if the change affects architecture, UI principles, or product behavior

---

## Code Standards

- Favor maintainability over cleverness
- Document the *why* behind non-obvious decisions, not the *what*
- Prefer clear names over comments
- No dead code left in place
- Consistent with the project's existing style and architecture

---

## What We Will Not Merge

- Features that optimize for engagement over capability
- Infinite scroll, feed, or consumption patterns
- Social features before they are architecturally planned (see [`docs/roadmap.md`](docs/roadmap.md))
- Changes that add complexity without clear mission alignment
- UI patterns that feel like social media

---

## Working Style

When we review contributions, we will:
- Challenge ideas that weaken the mission
- Recommend simpler solutions when they exist
- Protect the philosophy even when that means saying no
- Explain our reasoning rather than just blocking

We expect the same in return. Good-faith pushback is welcome. The mission is the guide.

---

*Build well. Sharpen one another.*
