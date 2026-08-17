---
title: Project Ideas
tags: [projects, brainstorm]
date: 2026-07-22
---

# Project Ideas

A running list of things worth prototyping.

## Active

- [ ] Obsidian dashboard app (this one!)
- [ ] Habit tracker synced with [[Daily Notes/2026-07-27]]
- [x] Set up a code/ folder for mobile-friendly dev

## Someday

- Personal finance tracker with CSV import
- Recipe box with tag-based search
- Book notes that link out to [[Reading List]]

## Notes

> Keep the Obsidian vault as the single source of truth — the app should only
> ever *read* it, never fight with Obsidian for write access.

```ts
// Example: a note's frontmatter shape
type NoteMeta = {
  title: string;
  tags: string[];
  date: string;
};
```
