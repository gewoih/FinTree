---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use when the user asks to build web components, pages, or applications, including UI refactors and visual redesigns. Generate creative, polished code that avoids generic AI aesthetics while respecting existing product design systems when they are mandatory.
---

# Frontend Design

Implement real working frontend code with a clear visual point of view and production-level polish.

## 1) Frame the Design Problem

- Identify purpose, audience, and success criteria from the request.
- Capture technical constraints (framework, component library, performance, accessibility).
- Identify one memorable differentiator for the interface before coding.

## 2) Commit to One Bold Aesthetic Direction

- Choose a specific design direction and execute it consistently.
- Define the direction in concrete terms:
  - Typography pairing
  - Color system
  - Layout composition
  - Motion language
  - Atmosphere details (texture, depth, decorative structure)
- Keep design intensity matched to intent:
  - Use restraint and precision for refined minimal designs.
  - Use richer layering and effects for maximal or expressive designs.

## 3) Respect System Constraints Without Becoming Generic

- Preserve mandatory repository design systems and UI conventions when they exist.
- Reuse existing tokens, spacing scales, and shared components when required.
- Add distinctiveness through composition, hierarchy, motion, and micro-detail instead of random style drift.

## 4) Build Production-Grade Code

- Deliver functional implementation, not mockups.
- Keep architecture clean and maintainable:
  - Separate rendering, state, and side effects.
  - Reuse shared components/primitives.
  - Keep API interactions in service boundaries.
- Ensure responsive behavior on mobile and desktop.

## 5) Design With Typographic Intent

- Select characterful type choices that match the aesthetic direction.
- Avoid default generic stacks unless repository constraints require them.
- Define hierarchy intentionally (display, section, body, metadata).
- Preserve readability and contrast at all breakpoints.

## 6) Use Color and Visual Atmosphere Deliberately

- Define a cohesive palette with CSS variables.
- Prefer strong dominant tones with controlled accents over flat neutral outputs.
- Build depth through gradients, overlays, textures, borders, and shadow strategy.
- Avoid overused AI patterns like default purple-on-white gradient aesthetics.

## 7) Use Motion for High-Impact Moments

- Focus animation on meaningful moments:
  - page entry sequence
  - section reveal/stagger
  - state transitions
  - hover/focus interactions
- Prefer CSS-first motion for simple interfaces.
- Keep timing, easing, and choreography consistent with the chosen aesthetic.
- Respect reduced-motion preferences.

## 8) Avoid Generic Layouts

- Use intentional composition choices (asymmetry, overlap, editorial spacing, controlled density) when appropriate.
- Avoid boilerplate component arrangements when the brief asks for distinctive design.
- Ensure novelty does not compromise usability or navigation clarity.

## 9) Enforce Accessibility and Performance Baselines

- Keep semantic structure and keyboard accessibility intact.
- Preserve visible focus states and sufficient contrast.
- Optimize heavy effects that impact runtime performance.
- Verify expensive visual treatments do not degrade interactivity.

## 10) Run an Anti-Slop Quality Pass

- Check the interface against this list before finalizing:
  - Is there a clear aesthetic concept?
  - Is the typography deliberate and non-generic?
  - Does the color system feel intentional and memorable?
  - Is motion coordinated rather than scattered?
  - Does the layout avoid predictable boilerplate?
  - Is the final code production-ready and maintainable?

## Reference

- Read `references/aesthetic-playbook.md` for design-direction options and implementation patterns.
