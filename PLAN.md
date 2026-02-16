# FinTree TODO Implementation Plan

## Context

This plan addresses the comprehensive TODO list covering UI/UX redesign, mobile-first refactoring, filter improvements, business logic fixes, and performance optimizations. The current codebase has several critical issues affecting data integrity (account transfers), user experience (mobile responsiveness), and performance (duplicate API calls).

**Priority Strategy:**
1. **Critical (P0)**: Data integrity bugs and mobile blocking issues
2. **High (P1)**: UX consistency and performance bottlenecks
3. **Medium (P2)**: Visual polish and design system refinement
4. **Low (P3)**: Nice-to-have improvements

---

## Phase 1: Critical Business Logic Fixes (P0)

### 1.1 Account Transfers - Atomic Transaction Logic ✅
**Status:** Already implemented correctly
- Current implementation in `FinTree.Application/Transactions/TransactionsService.cs` (lines 164-247) is atomic
- Three-transaction model (expense, income, fee) with shared `transferId`
- Single `SaveChangesAsync()` ensures atomicity
- **Action:** No changes needed; verify frontend validation instead

### 1.2 Balance Adjustment - UI Refresh Fix
**Issue:** After balance adjustment, account card doesn't update without page reload

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/InvestmentsPage.vue` (lines 260-276)
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/stores/finance.ts`

**Implementation:**
1. In `InvestmentsPage.vue`, the modal watcher already triggers `refreshInvestmentsData()` on close
2. Problem: Optimistic update on line 193-196 doesn't reflect backend calculation
3. **Solution:** Remove optimistic update, rely on full refresh from watcher (already working)
4. Verify same pattern on `AccountsPage.vue` for consistency

### 1.3 Transfer Frontend Validation - Block Insufficient Funds
**Issue:** Transfer succeeds on frontend even if sender balance insufficient (backend likely rejects)

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransferFormModal.vue`

**Implementation:**
1. Add computed property checking `fromAccount.balance >= transferAmount + feeAmount`
2. Disable submit button when insufficient funds
3. Show validation error message: "Недостаточно средств на счёте"
4. Consider showing available balance next to amount input

---

## Phase 2: Mobile-First Refactor (P0)

### 2.1 Modal Horizontal Scroll Fix ✅
**Status:** Completed

**Changes made:**
- Updated `prime-overrides.css`: Full viewport width (100vw), removed double border-radius
- Reduced mobile padding to `--ft-space-4` in TransactionForm, TransferFormModal, CategoryFormModal
- Fixed CategoryFormModal icon grid max-height to 40vh

### 2.2 Analytics Page Mobile Layout
**Issue:** Page requires zoom out to view content on mobile

**Files to investigate:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/AnalyticsPage.vue`

**Implementation:**
1. Audit grid layouts for mobile breakpoints (check for fixed widths)
2. Ensure widgets stack vertically on mobile (single column)
3. Charts should be responsive with `aspect-ratio` instead of fixed heights
4. Test widget overflow and text wrapping
5. Verify month selector accessibility on mobile

### 2.3 Tooltip/Help Icons - Touch Target Size
**Issue:** Help icons (`?`) in Analytics widgets too small for mobile taps

**Files to modify:**
- All Analytics widget components with help icons

**Implementation:**
1. Ensure minimum touch target: `min-width: 44px; min-height: 44px;`
2. Use `--ft-control-height` token (2.75rem = 44px)
3. Add `cursor: pointer` and proper hover/active states
4. Consider replacing `?` icon with `pi-info-circle` for larger visual target

---

## Phase 3: Performance Optimization (P1)

### 3.1 Eliminate Duplicate API Calls on Navigation

**Critical Issues Found:**
- `AnalyticsPage.vue` uses `force = true` flag on mount (disables cache)
- `TransactionList.vue` has 3 overlapping watchers that can trigger redundant fetches
- `InvestmentsPage.vue` modal watchers unconditionally refetch both endpoints

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/AnalyticsPage.vue` (line 676-680)
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionList.vue` (lines 379-419)
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/InvestmentsPage.vue` (lines 260-276)
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/stores/finance.ts`

**Implementation:**

**3.1.1 Remove force flag from AnalyticsPage:**
```typescript
// Line 679: Change from:
await financeStore.fetchAccounts(true)
// To:
await financeStore.fetchAccounts()
```

**3.1.2 Consolidate TransactionList watchers:**
- Combine all filter watchers into single watch with multiple sources
- Remove `immediate: true` (let onMounted handle initial load)
- Debounce entire filter change (not just search)

**3.1.3 Conditional modal refresh in InvestmentsPage:**
- Track which modal closed (balance adjustment vs account creation)
- Only refetch affected data (overview for balance, both for new account)

**3.1.4 Implement pending request deduplication in finance store:**
```typescript
const pendingRequests = new Map<string, Promise<any>>()

async function fetchWithDedup(key: string, fetcher: () => Promise<any>) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }

  const promise = fetcher().finally(() => pendingRequests.delete(key))
  pendingRequests.set(key, promise)
  return promise
}
```

### 3.2 Normalize Finance Store State

**Current Issue:** Denormalized arrays, no cache invalidation strategy, separate archived accounts fetch

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/stores/finance.ts`

**Implementation:**
1. Merge `accounts` and `archivedAccounts` into single normalized map:
   ```typescript
   const accountsById = ref<Map<string, Account>>(new Map())
   const allAccounts = computed(() => Array.from(accountsById.values()))
   const activeAccounts = computed(() => allAccounts.value.filter(a => !a.isArchived))
   const archivedAccounts = computed(() => allAccounts.value.filter(a => a.isArchived))
   ```

2. Add timestamp-based cache invalidation:
   ```typescript
   const lastFetch = ref<Record<string, number>>({})
   const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

   function isCacheValid(key: string): boolean {
     const timestamp = lastFetch.value[key]
     return timestamp && (Date.now() - timestamp) < CACHE_TTL
   }
   ```

3. Single unified `fetchAccounts()` method (no separate archived call)

---

## Phase 4: Filter Consistency & UX (P1)

### 4.1 Fix "Reset Filters" Inconsistency

**Issues:**
- `AccountsPage.vue` only resets `searchText`, leaves `view` (active/archived) and `sortBy` unchanged
- Other pages have complete reset

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/AccountsPage.vue` (lines 198-200)

**Implementation:**
```typescript
const clearFilters = () => {
  searchText.value = ''
  sortBy.value = 'balance-desc' // Reset to default
  // Don't reset view (active/archived) - this is tab selection, not a filter
}
```

**Rationale:** `view` is navigation (tabs), not a filter. Only reset search and sort.

### 4.2 Remove Aggressive Focus Styling

**Issue:** Input/select focus states have aggressive color highlighting

**Files to investigate:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/prime-overrides.css`
- Filter components: `TransactionFilters.vue`, `AccountFilters.vue`

**Implementation:**
1. Audit current focus styles in `prime-overrides.css`
2. Replace aggressive colors with subtle border/shadow:
   ```css
   .p-inputtext:focus,
   .p-dropdown:focus {
     border-color: var(--ft-border-focus); /* Subtle accent */
     box-shadow: 0 0 0 2px var(--ft-focus-ring); /* Minimal ring */
     outline: none;
   }
   ```
3. Ensure accessibility: maintain visible focus state (WCAG 2.4.7)

---

## Phase 5: Transaction UX Improvements (P1)

### 5.1 "Save and Add Another" - Preserve Date

**Issue:** Clicking "Save and add another" resets date to today; should preserve last entered date

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionForm.vue` (lines 215-248)

**Implementation:**
```typescript
// Line 235-237: Add date to preserved context
const keepDate = date.value // Add this line
const keepAccount = selectedAccount.value
const keepCategory = selectedCategory.value
const keepType = transactionType.value

// Line 242-248: Restore date after reset
selectedAccount.value = keepAccount
selectedCategory.value = keepCategory
transactionType.value = keepType
date.value = keepDate // Add this line
```

### 5.2 Category Loading Race Condition

**Issue:** Sometimes categories don't load before transaction list renders

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionList.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/ExpensesPage.vue` (lines 113-119)

**Implementation:**
1. In `ExpensesPage.vue` onMounted, ensure categories load before transactions:
   ```typescript
   onMounted(async () => {
     await Promise.all([
       financeStore.fetchCurrencies(),
       financeStore.fetchAccounts(),
       financeStore.fetchCategories() // Wait for this
     ])
     // TransactionList component will now have categories available
   })
   ```

2. In `TransactionList.vue`, add loading state check:
   ```typescript
   const canLoadTransactions = computed(() => store.categories.length > 0)

   watch([...filters, canLoadTransactions], () => {
     if (!canLoadTransactions.value) return
     fetchFilteredTransactions({ page: 1 })
   })
   ```

---

## Phase 6: Investment & Analytics Fixes (P2)

### 6.1 Investment Cards - Show Original Currency

**Issue:** If account currency ≠ base currency, should show original amount in small text

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/Investments/InvestmentAccountCard.vue`

**Implementation:**
```vue
<!-- Line 34: After base currency display -->
<div class="balance-base">
  {{ formattedBaseBalance }}
</div>
<div v-if="currencyCode !== baseCurrencyCode" class="balance-original">
  {{ formatCurrency(account.balance, currencyCode) }}
</div>

<style scoped>
.balance-original {
  font-size: var(--ft-font-size-sm);
  color: var(--ft-text-tertiary);
  margin-top: var(--ft-space-1);
}
</style>
```

### 6.2 Net Worth Chart - Historical Data Fix

**Status:** Already implemented correctly in backend
- `AnalyticsService.cs` (lines 321-326) detects opening balance via 5-second window
- Maps opening balance to `DateTime.UnixEpoch` for historical calculations
- Frontend receives zero-filled snapshots for months before account creation

**Action:** Verify frontend chart doesn't extrapolate backward from first non-zero point

---

## Phase 7: Account Type Selection (P2)

### 7.1 Add Account Type Dropdown

**Issue:** No way to specify account type (Cash vs Bank Account) during creation

**Files to modify:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/AccountFormModal.vue`
- Backend: Check if `AccountType` enum includes Cash/Bank (may already exist)

**Implementation:**
1. Add dropdown to form (after name field):
   ```vue
   <FormField label="Тип счёта">
     <Dropdown
       v-model="accountType"
       :options="accountTypes"
       optionLabel="label"
       optionValue="value"
       placeholder="Выберите тип"
     />
   </FormField>
   ```

2. Define account type options:
   ```typescript
   const accountTypes = [
     { label: 'Наличные', value: 0 },
     { label: 'Банковский счёт', value: 1 },
     { label: 'Брокерский счёт', value: 2 },
     { label: 'Криптовалютный кошелёк', value: 3 },
     { label: 'Депозит', value: 4 }
   ]
   ```

3. Include `type` in API request payload

---

## Phase 8: Design System Audit (P3)

### 8.1 Global Visual Audit

**Scope:** Full codebase visual consistency check

**Files to audit:**
- All components using design tokens
- `vue-app/src/assets/design-tokens.css`
- `vue-app/src/styles/theme.css`

**Implementation:**
1. **Color Palette Audit:**
   - Verify all colors use `--ft-*` tokens (no hardcoded hex)
   - Check color contrast ratios (WCAG AA: 4.5:1 for text)
   - Ensure dark/light mode parity

2. **Spacing Audit:**
   - Verify consistent use of spacing scale (`--ft-space-*`)
   - Check component internal spacing (padding, gap, margin)
   - Ensure mobile spacing adjustments

3. **Typography Audit:**
   - Verify font families: Inter (UI), JetBrains Mono (amounts)
   - Check font size hierarchy (`--ft-font-size-*`)
   - Ensure `tabular-nums` on financial amounts

4. **Border Radius Audit:**
   - Verify consistent use of `--ft-radius-*` tokens
   - Check nested component radius relationships
   - Mobile: consider reducing radius on full-screen elements

5. **Shadow Audit:**
   - Verify elevation system (`--ft-shadow-*`)
   - Check shadow consistency on cards, modals, dropdowns
   - Ensure shadows enhance depth perception

**Deliverable:** Create `VISUAL_AUDIT.md` with findings and recommendations

---

## Verification Plan

After each phase, verify changes on:

**Devices:**
- Desktop: 1440px, 1920px
- Tablet: 768px, 1024px
- Mobile: 360px, 375px, 390px, 414px

**Browsers:**
- Chrome/Edge (Chromium)
- Firefox
- Safari (iOS)

**Test Checklist:**
- [x] All modals open without horizontal scroll
- [ ] Filters reset completely (except tabs)
- [ ] Balance adjustments update UI immediately
- [ ] Transfers validate balance before submission
- [ ] "Save and add another" preserves date
- [ ] Categories load before transaction rendering
- [ ] No duplicate API calls on page navigation
- [ ] Analytics page renders correctly on mobile
- [ ] Help icons have adequate touch targets
- [ ] Investment cards show original currency
- [ ] Net Worth chart starts from first account creation
- [ ] Account type can be selected during creation
- [ ] Visual consistency across all pages
- [ ] Dark/light mode works correctly
- [ ] Accessibility: keyboard navigation, screen reader, focus states

---

## Critical Files Reference

**Modals:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionForm.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/AccountFormModal.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransferFormModal.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/CategoryFormModal.vue`

**Filters:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/TransactionFilters.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/components/AccountFilters.vue`

**Pages:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/AccountsPage.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/InvestmentsPage.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/AnalyticsPage.vue`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/pages/ExpensesPage.vue`

**State:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/stores/finance.ts`

**Styles:**
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/prime-overrides.css`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/assets/design-tokens.css`
- `/Users/nranenko/Desktop/Projects/FinTree/vue-app/src/styles/theme.css`

**Backend:**
- `/Users/nranenko/Desktop/Projects/FinTree/FinTree.Application/Transactions/TransactionsService.cs`
- `/Users/nranenko/Desktop/Projects/FinTree/FinTree.Application/Accounts/AccountsService.cs`
- `/Users/nranenko/Desktop/Projects/FinTree/FinTree.Application/Analytics/AnalyticsService.cs`

---

## Implementation Strategy

**Recommended Order:**
1. **Phase 2** (Mobile-First) - Immediate UX impact
2. **Phase 3** (Performance) - Foundational improvements
3. **Phase 5** (Transaction UX) - High user friction points
4. **Phase 4** (Filter Consistency) - Polish and consistency
5. **Phase 1** (Business Logic) - Already mostly correct, just validation
6. **Phase 6** (Investment/Analytics) - Lower priority enhancements
7. **Phase 7** (Account Type) - Feature addition
8. **Phase 8** (Design Audit) - Final polish

**Estimated Effort:**
- Phases 1-5: ~3-4 days (critical path)
- Phases 6-7: ~1-2 days (enhancements)
- Phase 8: ~2-3 days (comprehensive audit)

**Total: 6-9 days** for complete TODO resolution
