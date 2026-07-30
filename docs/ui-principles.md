# Iron×Iron — UI Principles

Design is philosophy made visible.

Every visual and interaction decision in Iron×Iron should express the values in [`philosophy.md`](philosophy.md): craftsmanship, quiet focus, competence, depth over surface. This document translates those values into concrete design guidance.

---

## The Aesthetic Reference

Iron×Iron should feel like:

- A **workshop** — purposeful, every tool in its place, nothing decorative
- A **library** — calm, focused, welcoming of long sessions
- A **forge** — honest materiality, weight, craft
- A **drafting table** — precision, clarity, the work itself is the subject

It should not feel like:
- A social media platform
- A SaaS dashboard
- A news aggregator
- A productivity app that wants to be fun

The difference is tone: social media is loud; Iron×Iron is quiet. Social media wants your attention; Iron×Iron respects it.

---

## Core Visual Principles

### 1. Whitespace is a feature

Whitespace is not empty space — it is breathing room. It signals that the content that is there matters, that it was chosen deliberately, that it does not need to compete for attention.

Generous whitespace is the primary way we communicate that this is not a feed.

**In practice:**
- Padding and margins should feel spacious, even slightly generous
- Resist the instinct to fill empty space with more content
- Section breaks should be felt, not just implied

### 2. Typography carries the experience

Most of what users do in Iron×Iron is read. Typography is therefore the most important visual decision in the product.

**Principles:**
- Body text should be comfortable for sustained reading: generous line height (1.6–1.75), moderate measure (60–75 characters per line), enough size (16px minimum)
- Hierarchy through weight and size, not color
- One or two typeface families maximum: one for display/headings, one for body
- The aesthetic should lean toward editorial and craft: a serif or humanist sans for body; a geometric or strong sans for display

**Avoid:**
- Small text that requires effort to read
- Excessive typeface variety
- Tracking that feels airy without purpose

### 3. Color is restrained

The palette should feel like materials: iron, wood, stone, paper, warm light.

**Approach:**
- A near-neutral dark (not pure black — closer to charcoal, slate, or deep warm gray)
- An off-white or warm paper tone for backgrounds in light mode
- One or two accent colors, both muted: iron blue, ember orange, deep amber, slate
- Functional color for status only: not decoration

**Avoid:**
- Vibrant gradients
- Neon or electric accent colors
- Brand colors that scream "SaaS"
- Dark mode that's harsh pure black

**Light and dark modes:** Both should feel calm. Dark mode should feel like working late by warm lamplight, not a terminal.

### 4. Motion is earned

Animation is not a default. Movement draws attention, and we are not in the attention business.

**When motion is appropriate:**
- Confirming a completed action (brief, subtle)
- A meaningful state transition (entering a deep read, completing the day's briefing)
- Loading states that would otherwise feel broken

**When motion is not appropriate:**
- Scrolling triggers
- Hover decorations
- Entrance animations for every element
- Anything looping or ambient

A good animation in Iron×Iron should feel like exhaling, not like fireworks.

### 5. Calm is a design decision

The UI should actively induce calm. This is not just an absence of noise — it requires positive choices:

- Consistent, predictable layout (users should never be surprised by where things are)
- No unread counts or badge-style notifications on navigation
- No urgency language in UI copy
- Error states that are clear but not alarming
- Success states that are satisfying but not celebratory

---

## Component Philosophy

### Navigation
- Top-level navigation maps directly to the four main areas
- No megamenus, no dropdowns on primary nav
- Active state is clear; everything else recedes

### Cards and Lists
- Each item should communicate enough to make a decision: read now, read later, skip
- No infinite scroll. Every list has an end.
- Completion states are first-class: a read item looks different from an unread one

### The Briefing
The Watchtower briefing is the heart of v1. Its design deserves special attention:
- The greeting should feel personal, not generic
- Priority levels (Critical, Worth Knowing, Curiosity) should be visually distinct but not alarming
- The completion state — "You are up to date. Go build." — should feel like a gift: you are done, you can close this and go make something

### The Forge
The workspace should feel like a desk: organized, yours, ready for work. Not a dashboard. Not a profile.

---

## Copy Voice

The voice of Iron×Iron is:
- **Confident** — it does not hedge or apologize
- **Direct** — it says what it means
- **Warm** — it is on the user's side
- **Brief** — it doesn't waste words

**Examples of on-brand copy:**
- "The horizon has changed." (not "You have new updates")
- "You are up to date. Go build." (not "You've reached the end of your feed!")
- "Today's sharpening:" (not "Your personalized content for today")
- "Begin." (not "Start Reading Now →")

**Avoid:**
- Exclamation points (almost always)
- Gamification language ("You've earned a badge!")
- Urgency language ("Don't miss out!")
- Passive voice in status messages

---

## Accessibility

Accessibility is not optional and is not a final-pass concern. It should be designed in from the start.

- Color contrast: WCAG AA minimum, WCAG AAA where practical
- Keyboard navigation: all interactive elements reachable and usable
- Screen reader support: semantic HTML, ARIA labels where needed
- Focus states: visible, consistent, not styled away
- Motion: respect `prefers-reduced-motion`

A product about making people more capable should be accessible to people with different abilities.

---

## Anti-Patterns

These patterns are explicitly prohibited regardless of their prevalence elsewhere:

| Pattern | Why not |
|---|---|
| Infinite scroll | Creates the feeling of incompleteness; there is no "done" |
| Notification badges on nav | Creates urgency and anxiety |
| "You've been inactive" prompts | The user is working, not idle |
| Confetti or celebration animations | Disproportionate; the reward is the work |
| Algorithmic content reordering mid-session | Disorienting; breaks the sense of a bounded briefing |
| Auto-playing media | Violates quiet focus |
| Dark pattern CTA language | We are not trying to trick users |

---

*The design is the promise. Every pixel either keeps it or breaks it.*
