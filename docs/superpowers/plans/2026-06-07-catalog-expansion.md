# 商品カタログ拡張 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 商品サジェスト用の静的カタログを64件から120件以上へ拡張する。

**Architecture:** 既存の `utils/productCatalog.ts` に代表商品を追加し、`item()` ファクトリ、検索ロジック、UI統合は変更しない。件数増加は構造整合性テストと最小件数テストで検証し、仕様書類の件数表記を更新する。

**Tech Stack:** TypeScript, Jest, React Native/Expo project structure

---

## File Structure

- `__tests__/productCatalog.test.ts`: カタログ最小件数テストを追加する
- `utils/productCatalog.ts`: 既存ブランドの代表商品を追加する
- `CLAUDE.md`: 商品サジェスト機能の件数表記を更新する
- `README.md`: ユーザー向けの商品サジェスト件数表記を更新する

### Task 1: カタログ件数テスト

**Files:**
- Modify: `__tests__/productCatalog.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it('代表商品が120件以上含まれている', () => {
  expect(CATALOG.length).toBeGreaterThanOrEqual(120);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- productCatalog`

Expected: FAIL because the current catalog has 64 items.

- [ ] **Step 3: Add representative catalog items**

Add enough `item(...)` entries to `utils/productCatalog.ts` so `CATALOG.length >= 120`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- productCatalog`

Expected: PASS.

### Task 2: ドキュメント更新

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update counts**

Replace catalog count wording with "主要41ブランドの代表商品 120件以上" or the final exact count.

- [ ] **Step 2: Run focused tests**

Run: `npm run test -- productCatalog`

Expected: PASS.

### Self-Review

- The plan covers catalog expansion, validation, and docs.
- No UI, DB, or search behavior changes are included.
- No placeholders remain.
