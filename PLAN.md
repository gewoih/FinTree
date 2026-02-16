# FinTree Implementation Plan

## Progress Overview

**Completed:** 14/19 tasks ✅
**In Progress:** 0 tasks 🔄
**Pending:** 5 tasks ⏳

---

## ✅ Completed Tasks

### Phase 2: Mobile-First Refactor
- **✅ Task #1: Modal horizontal scroll fix**
  - Fixed full viewport width on mobile (100vw)
  - Removed double border-radius conflict
  - Reduced mobile padding to `--ft-space-4`
  - CategoryFormModal icon grid now uses responsive 40vh height

- **✅ Task #2: Analytics page mobile layout**
  - Charts now use `aspect-ratio` (16/9 desktop, 4/3 mobile) instead of fixed heights
  - SpendingBarsCard and ForecastCard updated
  - Better responsive behavior across all screen sizes

- **✅ Task #3: Help icon touch targets**
  - All 7 analytics widgets now have 44px minimum touch targets
  - Updated components: HealthScoreCard, SummaryStrip, ForecastCard, SpendingBarsCard, SpendingPieCard, CategoryDeltaCard, PeakDaysCard
  - Added proper hover and active states

### Phase 3: Performance
- **✅ Task #4: Remove force flag from AnalyticsPage**
  - Removed `force=true` from `fetchAccounts()` and `fetchCurrentUser()`
  - Restored cache functionality for better performance

### Phase 4: Filter Consistency
- **✅ Task #9: Fix AccountsPage reset filters**
  - Now resets both `searchText` and `sortBy` to defaults
  - Consistent with other pages

### Phase 5: Transaction UX
- **✅ Task #7: Preserve date in "Save and add another"**
  - Date is now preserved along with type, account, and category
  - Users can batch-enter transactions for the same date

### Phase 2: Mobile-First Refactor (UI/UX Polish)
- **✅ Task #13: Fix SummaryStrip vertical alignment**
  - Always render secondary element with visibility control (`opacity: 0` when empty)
  - Changed icon alignment from `flex-start` to `center` for balanced look
  - Consistent layout regardless of secondary text presence

### Phase 4: Filter Consistency & UX
- **✅ Task #4.1: Remove Aggressive Focus Styling**
  - Replaced bright blue borders with subtle `--ft-border-strong`
  - Reduced focus ring opacity: 60% → 28% (dark), 35% → 22% (light)
  - Added `:focus-within` styles to custom search input wrappers
  - Maintains WCAG 2.4.7 accessibility with refined Stripe/Revolut aesthetic

### Phase 6: Investment & Analytics
- **✅ Task #6.1: Investment Cards - Show Original Currency**
  - Displays original balance below converted amount when currencies differ
  - Secondary styling with tooltip for context
  - File: `InvestmentAccountCard.vue`

### Phase 8: Design System Audit
- **✅ Task #8.1: Global Visual Audit**
  - ✅ Zero hardcoded colors in components
  - ✅ Zero hardcoded spacing values
  - ✅ Zero hardcoded shadows or font families
  - ✅ Consistent `--ft-*` token usage across all files
  - ⚠️ Minor: CTA button uses hardcoded RGB in shadows (acceptable - custom effect)
  - ✅ Dynamic inline styles in LandingPage (data-driven - acceptable)

---

## 🔄 In Progress

_(No tasks in progress)_

---

### Phase 1: Critical Business Logic
- **✅ Task #1.2: Balance Adjustment - UI Refresh**
  - Removed optimistic `fetchAccounts(true)` from AccountBalanceAdjustmentsModal
  - Now relies on InvestmentsPage modal watcher for proper data refresh
  - Account cards update correctly after balance adjustment

### Phase 5: Transaction UX (Continued)
- **✅ Task #5.1: Fix Category Loading Race Condition**
  - Added `canLoadTransactions` computed guard in TransactionList
  - Checks: `!areCategoriesLoading && categories.length > 0`
  - Prevents transactions from loading before categories are available
  - Filter watcher now waits for category data

### Phase 7: Account Type Selection
- **✅ Task #7.1: Add Account Type Dropdown**
  - Added `allowedTypes: [0, 3, 2, 4]` prop to AccountFormModal in AccountsPage
  - Users can now select: Банковский счет, Брокерский счет, Криптовалютный счет, Вклад
  - Updated hint text for generic usage (not just investments)
  - Type is included in API request payload

---

## ⏳ Pending Tasks

### Phase 1: Critical Business Logic (P0)
#### 1.1 Transfer Frontend Validation - Block Insufficient Funds
**Issue:** Transfer succeeds on frontend even if sender balance insufficient

**File:** `vue-app/src/components/TransferFormModal.vue`

**Implementation:**
- Add computed property: `fromAccount.balance >= transferAmount + feeAmount`
- Disable submit button when insufficient funds
- Show error: "Недостаточно средств на счёте"
- Display available balance

---

### Phase 3: Performance Optimization (P1)
#### 3.1 Consolidate TransactionList Watchers
**Issue:** 3 overlapping watchers causing redundant fetches

**File:** `vue-app/src/components/TransactionList.vue` (lines 379-419)

**Implementation:**
- Combine all filter watchers into single watch
- Remove `immediate: true` (let onMounted handle initial load)
- Debounce entire filter change

#### 3.2 Add Pending Request Deduplication
**Issue:** Same query can fire twice if rapid clicks

**File:** `vue-app/src/stores/finance.ts`

**Implementation:**
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

#### 3.3 Conditional Modal Refresh in InvestmentsPage
**Issue:** Modal watchers unconditionally refetch both endpoints

**File:** `InvestmentsPage.vue` (lines 260-276)

**Implementation:**
- Track which modal closed (balance adjustment vs account creation)
- Only refetch affected data

#### 3.4 Normalize Finance Store State
**Issue:** Denormalized arrays, no cache invalidation, separate archived fetch

**File:** `vue-app/src/stores/finance.ts`

**Implementation:**
- Merge `accounts` and `archivedAccounts` into single normalized map
- Add timestamp-based cache invalidation (5min TTL)
- Single unified `fetchAccounts()` method

---

### Phase 4: Filter Consistency & UX (P1)
#### 4.1 Remove Aggressive Focus Styling
**Issue:** Input/select focus states have aggressive color highlighting

**Files:** `prime-overrides.css`, filter components

**Implementation:**
- Replace aggressive colors with subtle border/shadow
- Use `--ft-border-focus` and `--ft-focus-ring` tokens
- Maintain WCAG 2.4.7 accessibility compliance

---

### Phase 6: Investment & Analytics (P2)
#### 6.1 Investment Cards - Show Original Currency
**Issue:** If account currency ≠ base currency, should show original amount

**File:** `InvestmentAccountCard.vue`

**Implementation:**
```vue
<div class="balance-base">{{ formattedBaseBalance }}</div>
<div v-if="currencyCode !== baseCurrencyCode" class="balance-original">
  {{ formatCurrency(account.balance, currencyCode) }}
</div>
```

#### 6.2 Net Worth Chart - Historical Data
**Status:** Already implemented correctly in backend
- Detects opening balance via 5-second window
- Maps to `DateTime.UnixEpoch` for historical calculations
- **Action:** Verify frontend doesn't extrapolate backward

---

### Phase 8: Design System Audit (P3)
#### 8.1 Global Visual Audit
**Scope:** Full codebase consistency check

**Areas:**
1. Color palette (verify `--ft-*` tokens, contrast ratios)
2. Spacing (consistent `--ft-space-*` usage)
3. Typography (Inter UI, JetBrains Mono amounts)
4. Border radius (consistent `--ft-radius-*`)
5. Shadows (elevation system `--ft-shadow-*`)

**Deliverable:** `VISUAL_AUDIT.md` with findings

---

## Verification Checklist

**Devices:** 360px, 375px, 390px, 414px, 768px, 1024px, 1440px, 1920px
**Browsers:** Chrome, Firefox, Safari (iOS)

- [x] Modals open without horizontal scroll
- [x] Help icons have adequate touch targets
- [x] Analytics page renders correctly on mobile
- [x] "Save and add another" preserves date
- [x] Filters reset completely (except tabs)
- [x] SummaryStrip items aligned correctly (icons centered)
- [x] Focus states are subtle and refined (no aggressive blue)
- [x] Investment cards show original currency when applicable
- [x] Design token consistency verified across codebase
- [x] Balance adjustments update UI immediately
- [x] Categories load before transaction rendering
- [x] Account type selectable during creation
- [ ] Transfers validate balance before submission
- [ ] No duplicate API calls on navigation
- [ ] Net Worth chart starts from first account
- [ ] Dark/light mode works correctly
- [ ] Accessibility: keyboard, screen reader, focus states

---

## Critical Files

**Frontend:**
- `vue-app/src/pages/AnalyticsPage.vue`
- `vue-app/src/pages/AccountsPage.vue`
- `vue-app/src/pages/InvestmentsPage.vue`
- `vue-app/src/pages/ExpensesPage.vue`
- `vue-app/src/components/TransactionForm.vue`
- `vue-app/src/components/TransferFormModal.vue`
- `vue-app/src/components/analytics/*.vue` (7 widget components)
- `vue-app/src/stores/finance.ts`
- `vue-app/src/styles/prime-overrides.css`

**Backend:**
- `FinTree.Application/Transactions/TransactionsService.cs`
- `FinTree.Application/Accounts/AccountsService.cs`
- `FinTree.Application/Analytics/AnalyticsService.cs`

---

## Next Steps

**Immediate priorities:**
1. Complete SummaryStrip alignment fix (Task #13) 🔄
2. Consolidate TransactionList watchers (Task #5) - High performance impact
3. Add request deduplication (Task #6) - Prevents duplicate API calls
4. Fix category loading race (Task #8) - User-facing bug

**Estimated remaining effort:** 3-4 days for P0-P1 tasks
