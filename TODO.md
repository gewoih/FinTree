## Analytics

- [ ] `FT-TODO-009` Rebuild category icons considering income/expense context  
  **Acceptance criteria:** two curated icon sets are used (income and expense) with fallback support for legacy values.

- [ ] `FT-TODO-011` Fix non-clickable tooltips in analytics on mobile
  **Acceptance criteria:** tooltips are fully interactive and accessible on mobile devices without gesture conflicts.

- [ ] `FT-TODO-015` Unify base expense calculation across forecast and liquidity metrics  
  **Acceptance criteria:** a single shared calculation logic is used for baseline expense in both forecast and liquidity features.

---

## Navigation & Layout

- [ ] `FT-TODO-012` Hide sidebar menu in mobile layout  
  **Acceptance criteria:** sidebar is collapsed by default and accessible via a dedicated mobile navigation trigger.

- [ ] `FT-TODO-013` Align top navigation and bottom navigation (mobile) styling with sidebar 
  **Acceptance criteria:** gradient is removed and navigation elements share a unified visual system with sidebar tokens.

---

## Charts & Visual System

- [ ] `FT-TODO-014` Remove chart color overrides (`chartColorGuards.ts`)  
  **Acceptance criteria:** no runtime color guards override chart palette behavior.

- [ ] `FT-TODO-016` Set default chart color to base olive token  
  **Acceptance criteria:** charts use base olive color as primary default unless explicitly overridden.

---

## Modals & Interaction Patterns

- [ ] `FT-TODO-017` Redesign confirmation modal (`confirm.require`) and extract dedicated component  
  **Acceptance criteria:** reusable confirmation component exists with consistent API, styling, and accessibility behavior.

---

## Marketing

- [ ] `FT-TODO-010` Reduce and restructure landing page content  
  **Acceptance criteria:** landing page follows compact structure (hero + key sections) without excessive text density.