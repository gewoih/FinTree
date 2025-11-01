# FinTree Redesign — QA & Acceptance Criteria

## Visual Design QA

### Color & Contrast
- [ ] All text meets WCAG AAA contrast ratio (7:1 minimum)
  - [ ] Primary text on white: ≥ 7:1
  - [ ] Secondary text on white: ≥ 4.5:1
  - [ ] Dark mode primary text: ≥ 7:1
  - [ ] Dark mode secondary text: ≥ 4.5:1
- [ ] Success/Warning/Danger badges have sufficient contrast
- [ ] Link colors are distinguishable from body text
- [ ] Focus indicators are visible (3:1 contrast minimum)

### Typography
- [ ] Font family loads correctly (Inter or fallback)
- [ ] Type scale is consistent across all pages
  - [ ] Headings: 32px / 24px / 20px
  - [ ] Body: 16px
  - [ ] Small text: 14px / 12px
- [ ] Line heights provide comfortable reading (1.5 for body, 1.25 for headings)
- [ ] No text overflow or truncation issues

### Spacing & Layout
- [ ] All spacing follows 4px/8px grid
- [ ] Cards have consistent padding (16px/24px)
- [ ] Sections have consistent vertical spacing
- [ ] No layout shifts on page load
- [ ] Responsive breakpoints work correctly:
  - [ ] Mobile (375px - 639px)
  - [ ] Tablet (640px - 1023px)
  - [ ] Desktop (1024px+)

### Components
- [ ] **Buttons**
  - [ ] Hover state shows 2px lift + shadow
  - [ ] Active state returns to baseline
  - [ ] Disabled state is visually distinct
  - [ ] Icon buttons have proper padding
  - [ ] Loading state shows spinner
- [ ] **Cards**
  - [ ] Border radius is 24px (--ft-radius-2xl)
  - [ ] Hover state enhances shadow
  - [ ] Content doesn't overflow
- [ ] **Inputs**
  - [ ] Focus ring is 4px with primary color
  - [ ] Error states show red border
  - [ ] Helper text is visible
  - [ ] Placeholder text is legible
- [ ] **Tables (DataTable)**
  - [ ] Headers are sticky on scroll
  - [ ] Striped rows alternate
  - [ ] Hover highlights row
  - [ ] Sort indicators are visible
  - [ ] No horizontal scroll on mobile (responsive)

### Icons
- [ ] All PrimeIcons load correctly
- [ ] Icon sizes are consistent within context
- [ ] Icon colors match design tokens
- [ ] No missing icon placeholders

---

## Functional QA

### Navigation
- [ ] **AppShell (Authenticated)**
  - [ ] Logo navigates to dashboard
  - [ ] Sidebar shows all navigation items
  - [ ] Active route is highlighted
  - [ ] Mobile: Hamburger menu toggles sidebar
  - [ ] Desktop: Sidebar is always visible
  - [ ] User menu shows profile/settings/logout
  - [ ] Logout redirects to login page
- [ ] **Landing Page (Public)**
  - [ ] Nav links scroll to sections smoothly
  - [ ] "Get Started" navigates to registration
  - [ ] "Sign In" navigates to login
  - [ ] All anchor links work

### Pages

#### Landing Page
- [ ] Hero section loads with correct copy
- [ ] Features grid displays 6 cards
- [ ] "How It Works" shows 3 steps
- [ ] Security section highlights 4 features
- [ ] Pricing cards show Free and Pro tiers
- [ ] FAQ items expand/collapse on click
- [ ] CTA buttons navigate to registration
- [ ] Footer links are functional

#### Dashboard (HomePage)
- [ ] PageHeader displays title and subtitle
- [ ] KPICards show:
  - [ ] Total Balance (with trend)
  - [ ] Monthly Expenses (with trend)
  - [ ] Active Accounts count
- [ ] "Add Transaction" button opens dialog
- [ ] Recent transactions load
- [ ] Charts render correctly
- [ ] EmptyState shows when no data

#### Accounts Page
- [ ] PageHeader displays "Accounts"
- [ ] Account cards show balance and currency
- [ ] "Add Account" button opens dialog
- [ ] EmptyState shows when no accounts
- [ ] Edit account updates data
- [ ] Delete account shows confirmation dialog

#### Transactions Page
- [ ] PageHeader displays "Transactions"
- [ ] DataTable shows all columns (Date, Amount, Category, Account, Description)
- [ ] Filters work (search, category, account, date range)
- [ ] Pagination works
- [ ] "Add Transaction" button opens dialog
- [ ] EmptyState shows when no transactions
- [ ] Edit transaction updates data
- [ ] Delete transaction shows confirmation dialog

#### Categories Page
- [ ] PageHeader displays "Categories"
- [ ] Category cards show name and color
- [ ] "Create Category" button opens dialog
- [ ] EmptyState shows when no categories
- [ ] Edit category updates data
- [ ] Delete category shows confirmation (prevents if in use)

#### Analytics Page
- [ ] Charts render (Line, Pie, Bar)
- [ ] Date range filter updates charts
- [ ] Chart legends are readable
- [ ] Export button works (future feature)

#### Settings Page (Profile)
- [ ] User email displays
- [ ] Base currency selector works
- [ ] Telegram handle saves
- [ ] Dark mode toggle works
- [ ] "Save" button updates profile
- [ ] Success toast appears on save

### Components

#### EmptyState
- [ ] Icon displays correctly
- [ ] Title and description are readable
- [ ] Action button triggers event
- [ ] Hidden when data exists

#### KPICard
- [ ] Loading state shows skeleton
- [ ] Value displays formatted
- [ ] Trend arrow points correct direction
- [ ] Variant styling applies (success/warning/danger)
- [ ] Hover effect works

#### PageHeader
- [ ] Breadcrumbs navigate correctly
- [ ] Title and subtitle display
- [ ] Actions slot renders buttons
- [ ] Mobile: Actions stack below title

#### StatusBadge
- [ ] Severity colors are correct
- [ ] Icon displays if provided
- [ ] Dot displays if `dot=true`
- [ ] Size variants work (sm/md/lg)

---

## Interaction & Animation QA

### Micro-interactions
- [ ] Button hover: 2px translateY, shadow grows (220ms)
- [ ] Card hover: Shadow enhances, subtle lift (220ms)
- [ ] Input focus: Blue ring fades in (150ms)
- [ ] Sidebar toggle: Slides smoothly (220ms)
- [ ] Toast appears: Slide from right (220ms)
- [ ] Dialog opens: Fade + scale (220ms)
- [ ] FAQ expand: Smooth height transition (220ms)

### Loading States
- [ ] Skeleton loaders appear before data
- [ ] Spinner shows for async actions
- [ ] Loading doesn't block UI
- [ ] No flash of unstyled content (FOUC)

### Error Handling
- [ ] Form validation shows inline errors
- [ ] API errors show toast notifications
- [ ] 404 pages redirect to dashboard
- [ ] Network errors display retry option

---

## Theme & Dark Mode QA

### Light Mode
- [ ] All pages render correctly
- [ ] Text is legible
- [ ] Borders are visible
- [ ] Shadows provide depth
- [ ] No washed-out colors

### Dark Mode
- [ ] `.dark-mode` class applied to `<html>`
- [ ] All pages render correctly
- [ ] Text is legible (AAA contrast)
- [ ] Borders are visible
- [ ] Deeper shadows provide depth
- [ ] No overly bright colors

### Theme Toggle
- [ ] Button shows moon icon in light mode
- [ ] Button shows sun icon in dark mode
- [ ] Theme persists after page reload
- [ ] Smooth transition between themes (no flash)
- [ ] Respects system preference on first visit

---

## Accessibility QA

### Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements are focusable
- [ ] Focus indicators are visible (3:1 contrast)
- [ ] Enter activates buttons
- [ ] Escape closes dialogs/menus
- [ ] Arrow keys navigate menus

### Screen Readers
- [ ] Page titles are descriptive
- [ ] ARIA labels on icon-only buttons
- [ ] Form inputs have labels
- [ ] Error messages are announced
- [ ] Toast notifications are announced
- [ ] Tables have captions
- [ ] Charts have accessible alternatives

### Touch Targets
- [ ] All buttons ≥ 44px height
- [ ] Interactive elements have 8px spacing
- [ ] No accidental taps

### Forms
- [ ] Labels are visible
- [ ] Required fields are marked
- [ ] Error states are clear
- [ ] Helper text provides guidance
- [ ] Success states are confirmed

---

## Performance QA

### Load Time
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1

### Runtime Performance
- [ ] No jank during scrolling (60fps)
- [ ] Animations are smooth
- [ ] Search/filter debounced (300ms)
- [ ] DataTable virtualizes for 1000+ rows
- [ ] Charts lazy load on Analytics page

### Network
- [ ] Images use WebP format
- [ ] Lazy loading for offscreen content
- [ ] No unnecessary API calls
- [ ] Requests are debounced/throttled

### Bundle Size
- [ ] Main bundle < 200kb (gzipped)
- [ ] Route chunks < 50kb each
- [ ] CSS < 50kb (gzipped)

---

## Cross-Browser QA

### Desktop
- [ ] Chrome 90+ ✓
- [ ] Firefox 88+ ✓
- [ ] Safari 14+ ✓
- [ ] Edge 90+ ✓

### Mobile
- [ ] iOS Safari 14+ ✓
- [ ] Chrome Android 90+ ✓
- [ ] Samsung Internet ✓

### Specific Browser Checks
- [ ] CSS Grid works (all layouts)
- [ ] CSS Variables work (design tokens)
- [ ] Backdrop-filter works (glassmorphism)
- [ ] Flexbox gap works
- [ ] `clamp()` works (responsive spacing)

---

## Responsive QA

### Mobile (375px - 639px)
- [ ] Sidebar hidden, hamburger menu visible
- [ ] Navigation stacks vertically
- [ ] Cards stack in single column
- [ ] Tables scroll horizontally or responsive columns
- [ ] KPI cards stack
- [ ] PageHeader actions stack below title
- [ ] Footer columns stack
- [ ] Landing page hero is readable

### Tablet (640px - 1023px)
- [ ] Sidebar hidden, hamburger menu visible
- [ ] Cards display in 2 columns
- [ ] KPI cards display in 2 columns
- [ ] Tables have comfortable padding
- [ ] Landing page features show 2 per row

### Desktop (1024px+)
- [ ] Sidebar always visible
- [ ] Cards display in 3 columns
- [ ] KPI cards display in 3 columns
- [ ] Tables have full width
- [ ] Landing page features show 3 per row
- [ ] Max content width: 1536px (centered)

---

## Security QA

### Authentication
- [ ] Unauthenticated users redirected to login
- [ ] JWT token stored securely
- [ ] Token included in API requests
- [ ] 401 responses clear auth state
- [ ] Logout clears token from localStorage

### Data Protection
- [ ] No sensitive data in console logs
- [ ] No exposed API keys in client code
- [ ] HTTPS enforced (in production)
- [ ] XSS protection (sanitized inputs)
- [ ] CSRF protection (if applicable)

---

## Edge Cases QA

### Empty States
- [ ] No accounts: Shows EmptyState
- [ ] No transactions: Shows EmptyState
- [ ] No categories: Shows EmptyState
- [ ] Search with no results: Shows "No results found"

### Long Content
- [ ] Long transaction descriptions truncate
- [ ] Long category names truncate
- [ ] Long account names truncate
- [ ] Overflow handled gracefully

### Large Datasets
- [ ] 1000+ transactions load without lag
- [ ] Pagination works correctly
- [ ] Virtual scrolling for large lists
- [ ] Filters don't freeze UI

### Offline
- [ ] Shows offline indicator (future)
- [ ] Cached data displays
- [ ] Queue actions for later sync (future)

---

## Localization QA (Future)

- [ ] Russian language support
- [ ] Date formats respect locale
- [ ] Currency symbols display correctly
- [ ] Number formatting (1,000.00 vs 1 000,00)
- [ ] RTL support (if needed)

---

## Final Acceptance Criteria

### Must Have (Launch Blockers)
- [x] Design tokens implemented
- [x] Common components built (EmptyState, KPICard, PageHeader, StatusBadge)
- [x] AppShell layout with sidebar
- [x] Landing page with hero, features, pricing, FAQ
- [ ] Dark mode toggle functional
- [ ] All pages use new components
- [ ] AAA accessibility compliance
- [ ] Cross-browser compatibility

### Should Have (Post-Launch)
- [ ] Onboarding tour (Shepherd.js)
- [ ] Settings page (2FA, preferences)
- [ ] Advanced analytics charts
- [ ] Budget tracking feature
- [ ] Export data (CSV, PDF)

### Nice to Have (Future)
- [ ] Bank integrations (Plaid)
- [ ] PWA with offline support
- [ ] Multi-language (i18n)
- [ ] Mobile app (React Native)
- [ ] Recurring transactions

---

## Sign-off

### Design Review
- [ ] UI/UX Designer approval
- [ ] Accessibility specialist approval
- [ ] Brand consistency verified

### Development Review
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security audit passed

### QA Review
- [ ] All test cases passed
- [ ] No critical bugs
- [ ] No accessibility violations

### Stakeholder Review
- [ ] Product owner approval
- [ ] User acceptance testing completed
- [ ] Go-live approved

---

**Last Updated**: [Date]
**Reviewed By**: [Name]
**Status**: ☐ In Progress | ☐ Ready for Launch | ☐ Launched
