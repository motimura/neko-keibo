# 商品カタログ汎用候補 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 商品サジェストに「詳細を追記」できる汎用候補を追加する。

**Architecture:** `CatalogItem` に表示用ラベルと入力用名前の任意フィールドを追加し、既存の商品候補はそのまま動かす。サジェストコンポーネントは表示時に `suggestionLabel ?? displayName` を使い、ExpenseForm は選択時に `inputName ?? displayName` を使う。

**Tech Stack:** TypeScript, React Native, Jest, @testing-library/react-native

---

## Files

- `types/catalog.ts`: `suggestionLabel`, `inputName` を追加
- `utils/productCatalog.ts`: `item()` に任意オプション引数を追加し、汎用候補を追加
- `components/ProductSuggestions.tsx`: 表示ラベルを `suggestionLabel` 優先に変更
- `components/ExpenseForm.tsx`: 選択時の品名入力を `inputName` 優先に変更
- `__tests__/productCatalog.test.ts`: 汎用候補の構造テストを追加
- `__tests__/ProductSuggestions.test.tsx`: 表示ラベルと入力値のテストを追加

## Tasks

- [ ] Add failing tests for `suggestionLabel` display and `inputName` selection
- [ ] Extend `CatalogItem` and `item()` with optional fields
- [ ] Update ProductSuggestions display
- [ ] Update ExpenseForm selection
- [ ] Add initial template catalog entries
- [ ] Run focused catalog/suggestion tests
