# CLAUDE.md

このファイルはClaude Codeがプロジェクトを理解するためのコンテキストドキュメントです。

## プロジェクト概要

**猫計簿 (Neko-Keibo)** — 猫にかかる費用や消耗品の在庫を管理するモバイルアプリケーション。
iOS / Android 両対応。ローカルファーストで端末内にデータを保存し、オフラインで完全に動作する。
将来的にApp Store / Google Play への公開を見据えている。

## 技術スタック

- **フレームワーク**: React Native (Expo managed workflow)
- **言語**: TypeScript
- **スタイル**: NativeWind (Tailwind CSS for React Native)
- **ローカルDB**: expo-sqlite
- **状態管理**: Zustand
- **ナビゲーション**: Expo Router (file-based routing)
- **グラフ**: react-native-chart-kit または victory-native
- **日付ピッカー**: react-native-modal-datetime-picker + @react-native-community/datetimepicker
- **通知**: expo-notifications（Phase 3: 買い替えリマインダー）
- **ファイル操作**: expo-file-system + expo-sharing + expo-document-picker（Phase 4: エクスポート/インポート）
- **ビルド & 配信**: EAS Build + EAS Submit

バックエンドサーバーは不要。全てのデータは端末内のSQLiteに保存する。

## ディレクトリ構成

```
neko-keibo/
├── app/                        # Expo Router (画面定義)
│   ├── _layout.tsx             # ルートレイアウト (4タブ: ホーム/記録/通知/設定)
│   ├── index.tsx               # ホーム（ダッシュボード）+ FABボタン
│   ├── add.tsx                 # 支出登録（モーダル、タブ非表示）
│   ├── (records)/              # 記録タブ（セグメントコントロール）
│   │   ├── _layout.tsx         # セグメントコントロール（支出一覧/在庫管理）
│   │   ├── index.tsx           # → expenses へリダイレクト
│   │   ├── expenses.tsx        # 支出一覧 + FABボタン
│   │   └── inventory.tsx       # 在庫管理
│   ├── notifications.tsx       # 通知一覧
│   └── settings.tsx            # 設定
├── components/                 # 共通コンポーネント
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── Dashboard.tsx
│   ├── MonthPicker.tsx
│   ├── CategoryBadge.tsx
│   ├── InventoryList.tsx       # ステータス別セクションリスト
│   ├── InventoryEditModal.tsx  # 在庫詳細/編集モーダル
│   ├── InventoryForm.tsx       # 在庫手動追加フォーム
│   ├── ReminderSetting.tsx     # 通知周期設定コンポーネント
│   └── ui/                     # 汎用UIコンポーネント
├── db/                         # データベース層
│   ├── schema.ts               # テーブル定義 & マイグレーション
│   ├── expenses.ts             # 支出のCRUD操作
│   ├── dashboard.ts            # 集計クエリ
│   ├── inventory.ts            # 在庫のCRUD操作
│   └── notifications.ts        # 通知履歴のCRUD操作
├── stores/                     # Zustand ストア
│   ├── useExpenseStore.ts
│   ├── useInventoryStore.ts    # 在庫用ストア
│   └── useNotificationStore.ts # 通知用ストア
├── types/                      # 型定義
│   ├── expense.ts
│   ├── inventory.ts            # 在庫の型定義
│   └── notification.ts         # 通知の型定義
├── utils/                      # ユーティリティ
│   ├── validator.ts            # バリデーション
│   ├── constants.ts            # カテゴリ定義、色、絵文字、在庫ステータス定数
│   ├── inventoryStatus.ts      # 在庫ステータス自動判定ロジック
│   ├── notifications.ts        # 通知スケジュール管理（expo-notifications）
│   ├── id.ts                   # ID生成（expo-crypto UUID）
│   ├── export.ts               # データエクスポート（JSON/CSV）
│   └── import.ts               # データインポート（JSON/CSV）
├── __tests__/                  # テスト
├── app.json                    # Expo設定
├── eas.json                    # EAS Build設定
├── package.json
└── tsconfig.json
```

## SQLite テーブル設計

### expenses テーブル

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  expense_date TEXT NOT NULL,
  memo TEXT DEFAULT '',
  inventory_id TEXT,
  reminder_days INTEGER,
  notification_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_year_month ON expenses(substr(expense_date, 1, 7));
```

- `inventory_id`: 在庫連動時に在庫アイテムのIDを保存（NULLなら連動なし）
- `reminder_days`: 通知までの日数（NULLなら通知なし）
- `notification_id`: expo-notifications のスケジュールID（キャンセル・再スケジュール用）

### inventory テーブル

```sql
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sufficient',
  last_purchased_at TEXT,
  average_consumption_days INTEGER,
  next_purchase_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- `status`: sufficient（十分）/ low（そろそろ）/ critical（切れそう）
- `average_consumption_days`: 廃止（DBカラムは残存するが読み書きしない）。ステータス計算は紐づく最新支出の `expenses.reminder_days` を使用
- `next_purchase_date`: last_purchased_at + reminder_days から自動計算

## 支出カテゴリ

`utils/constants.ts` が信頼できる唯一の定義元（Single Source of Truth）。

| コード | ラベル | 絵文字 | 色 |
|--------|--------|--------|------|
| food | フード | 🍗 | #FF6B6B |
| litter | 猫砂 | 🪣 | #4ECDC4 |
| medical | 医療 | 🏥 | #45B7D1 |
| toy | おもちゃ | 🧸 | #96CEB4 |
| goods | グッズ | 🛏️ | #FFEAA7 |
| grooming | トリミング | ✂️ | #DDA0DD |
| other | その他 | 📦 | #B0BEC5 |

## 画面構成

| 画面 | パス | 説明 |
|------|------|------|
| ホーム | / | 月間ダッシュボード（合計金額、カテゴリ別円グラフ、前月比）+ 在庫アラート + FAB＋ボタン |
| 支出登録 | /add | モーダル表示。カテゴリ、品名、金額、日付（カレンダーピッカー）、メモ + 在庫連動トグル + 通知設定 |
| 記録（支出一覧） | /(records)/expenses | 月別の支出リスト、通知設定済みに🔔表示、スワイプで編集・削除 + FAB＋ボタン |
| 記録（在庫管理） | /(records)/inventory | ステータス別セクション表示、手動追加、詳細編集モーダル |
| 通知一覧 | /notifications | 未対応の通知リスト、再購入/あとで/通知オフのアクション |
| 設定 | /settings | JSON/CSVエクスポート、バックアップ復元、CSVインポート、全データ削除、アプリ情報 |

## 在庫管理仕様（Phase 2）

### 在庫ステータス

| ステータス | ラベル | 絵文字 | 色 | 条件 |
|-----------|--------|--------|------|------|
| sufficient | 十分 | 🟢 | #4ECDC4 | 残り8日以上 or 未設定 |
| low | そろそろ | 🟡 | #FFEAA7 | 残り1〜7日 |
| critical | 切れそう | 🔴 | #FF6B6B | 残り0日以下 |

### 消耗品カテゴリ

`food`（フード）と `litter`（猫砂）が消耗品として扱われ、支出登録時に自動で在庫連動する。

### 支出→在庫連動フロー

1. 支出登録画面で「在庫に追加」トグルがON（消耗品カテゴリはデフォルトON）
2. 登録時に品名で在庫を検索（完全一致 → 部分一致）
3. 既存在庫が見つかった場合: ステータスを `sufficient` にリセット、最終購入日を更新
4. 見つからない場合: 新規在庫アイテムを自動作成
5. expenses レコードに `inventory_id` を保存

### ステータス自動更新

- アプリ起動時・在庫画面フォーカス時に `refreshAllInventoryStatuses()` を実行
- 紐づく最新支出（`expenses.inventory_id`）の `reminder_days` が設定されているアイテムのみ対象
- `last_purchased_at + reminder_days - today` で残り日数を計算
- `inventory.average_consumption_days` は廃止済み。既存データは `db/schema.ts` の移行SQLで `expenses.reminder_days` にコピーされる

### タブナビゲーション

ホーム / 記録 / 通知 / 設定 の4タブ構成。
- 「登録」はタブから削除 → ホーム・記録画面のFAB「＋」ボタンからモーダルで開く
- 「一覧」と「在庫」は「記録」タブに統合、セグメントコントロールで切替
- 通知タブには未対応件数のバッジを表示

## 開発フェーズ

- **Phase 1**: 支出記録 + ダッシュボード（SQLite CRUD + グラフ表示）✅
- **Phase 2**: 消耗品の在庫管理 ✅
- **Phase 3**: 買い替えリマインダー（expo-notifications によるローカル通知）✅
- **Phase 4**: データエクスポート/インポート（JSON/CSV）← 現在（実装済み）
- **Phase 5**: ストア公開（EAS Submit で App Store / Google Play）

## コマンド

```bash
# 開発
npx expo start                    # 開発サーバー起動
npx expo start --ios              # iOSシミュレーターで起動
npx expo start --android          # Androidエミュレーターで起動

# ビルド
eas build --platform ios          # iOS ビルド
eas build --platform android      # Android ビルド
eas build --platform all          # 両方ビルド

# ストア提出
eas submit --platform ios         # App Store
eas submit --platform android     # Google Play

# テスト
npm run test                      # 全テスト実行
npm run test:watch                # ウォッチモード

# Lint
npm run lint
```

## テストに関するルール

**MVPであっても必ずテストを書くこと。** テストのないコードはマージしない。

- db/ のCRUD操作には単体テストを書く
- バリデーションロジックには入力パターンを網羅したテストを書く
- 画面コンポーネントには最低限のレンダリングテストを書く
- テストファイルは `__tests__/` ディレクトリに配置する
- テストフレームワークは jest + @testing-library/react-native

## CLAUDE.md の更新ルール

**仕様が変わったら必ずこのファイルを更新すること。** 具体的には以下の場合に更新が必要：

- SQLiteテーブル設計（カラム追加、インデックス追加など）が変わった場合
- 画面構成やナビゲーションが変更された場合
- カテゴリが追加・変更された場合
- 新しい Phase の実装が始まった場合
- 技術スタックやライブラリが変更された場合
- ディレクトリ構成が変わった場合
- 開発コマンドが追加・変更された場合

CLAUDE.md が古いと Claude Code が誤った前提でコードを生成するため、コードの変更とセットで更新する。

**README.md も同時に更新すること。** README.md はユーザー向けの仕様書を兼ねているため、機能追加・変更・削除があった場合は CLAUDE.md と README.md の両方を更新する。

## v1 (Web版) からの変更履歴

- v1: React (Vite) + AWS サーバーレス（DynamoDB + Lambda + API Gateway）
- v2: React Native (Expo) + ローカルSQLite に方針転換
- 理由: モバイルアプリとしてストア公開を見据え、ローカルファーストで運用コスト $0 を実現するため
- v1の型定義・バリデーションロジック・カテゴリ定義は v2 に流用

## 通知（リマインダー）仕様

### 概要

支出登録時に「次回の買い替え通知」を任意で設定できる。
指定した期間が経過するとローカル通知が届き、アプリ内で通知履歴を確認できる。
通知からワンボタンで同じ商品の再購入を記録できる。

### 通知設定フロー

1. 支出登録画面で通知周期を任意設定
   - 設定しない（デフォルト）
   - ○日後（1〜365日、自由入力）
   - ○週間後（1〜52週、選択 → 日数に変換）
   - ○ヶ月後（1〜12ヶ月、選択 → 日数に変換）
2. 登録時に expo-notifications の scheduleNotificationAsync で通知をスケジュール
3. 通知IDをSQLiteのexpensesレコードに紐づけて保存

### 通知発火時の動作

1. OSレベルのローカル通知が表示される
   - タイトル: 「🐱 猫計簿」
   - 本文: 「🍗 ロイヤルカナン インドア 2kg そろそろ買い替え時です」
2. 通知タップ → アプリの通知一覧画面に遷移
3. 通知一覧で各通知に対して以下のアクションが可能
   - 「同じものを購入」→ 同じカテゴリ・品名・金額で新しい支出を自動登録 + 同じ周期で次回通知を再スケジュール
   - 「あとで」→ 通知を未対応のまま残す
   - 「通知をオフ」→ このアイテムの定期通知を解除

### 通知周期の変更

- 支出一覧画面から既存の支出の通知設定を変更できる
- 変更時は既存のスケジュール済み通知をキャンセルして再スケジュール

### SQLite 追加カラム

expenses テーブルに以下を追加:

```sql
ALTER TABLE expenses ADD COLUMN reminder_days INTEGER;
ALTER TABLE expenses ADD COLUMN notification_id TEXT;
```

- reminder_days: 通知までの日数（NULLなら通知なし）
- notification_id: expo-notifications のスケジュールID（キャンセル・再スケジュール用）

### notifications テーブル（通知履歴）

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reminder_days INTEGER NOT NULL,
  notified_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  acted_at TEXT,
  FOREIGN KEY (expense_id) REFERENCES expenses(id)
);

CREATE INDEX idx_notifications_status ON notifications(status);
```

- status: pending（未対応）/ purchased（再購入済み）/ dismissed（通知オフ）

### 画面への影響

| 画面 | 変更内容 |
|------|------|
| 支出登録 (add) | 通知周期の設定UIを追加 |
| 支出一覧 (expenses) | 通知設定の変更UIを追加、通知アイコン表示 |
| 通知一覧 (notifications) | 新規画面。未対応の通知リスト + アクションボタン |
| タブナビゲーション | 通知タブを追加（バッジで未読件数表示） |

### 制約事項

- iOSのローカル通知スケジュール上限は64件
- 上限を超える場合はアプリ起動時に直近のものから優先的に再スケジュール
- アプリアンインストールで通知は消えるため、再インストール時にSQLiteの履歴から再スケジュールする

## データエクスポート/インポート仕様（Phase 4）

### エクスポート

**JSONエクスポート** (`utils/export.ts` → `exportToJSON`):
- expenses, inventory, notifications の全データを含む
- メタデータ: `{ version: "1.0", exportedAt: ISO8601, data: { ... } }`
- `notification_id` は端末固有のため除外
- ファイル名: `neko-keibo-backup-YYYY-MM-DD.json`

**CSVエクスポート** (`utils/export.ts` → `exportToCSV`):
- expenses のみ。家計簿アプリとの互換性を意識
- ヘッダー: 日付,カテゴリ,品名,金額,メモ
- カテゴリは日本語ラベルで出力（food → フード）
- UTF-8 BOM付き（Excel対応）
- ファイル名: `neko-keibo-backup-YYYY-MM-DD.csv`

共通:
- `expo-file-system` の `File` / `Paths.cache` でファイル一時保存
- `expo-sharing` の `shareAsync` でOS共有シート表示

### インポート

**JSONインポート** (`utils/import.ts` → `importFromJSON`):
- バリデーション: version チェック、カテゴリ/ステータス検証、必須フィールド確認
- 2モード: 「上書き」（全削除→INSERT）/ 「マージ」（IDベースで重複スキップ）
- トランザクションで一括処理
- インポート後に `rescheduleAllReminders` で通知を再スケジュール

**CSVインポート** (`utils/import.ts` → `importFromCSV`):
- カテゴリの日本語ラベルからコードに変換
- IDは新規生成、在庫連動なし
- トランザクションで一括処理

ファイル選択: `expo-document-picker` の `getDocumentAsync`

### 設定画面 (`app/settings.tsx`)

- データ管理セクション: JSONバックアップ / CSVエクスポート / バックアップ復元 / CSVインポート
- データ削除セクション: 全データ削除（確認ダイアログ2回）
- アプリ情報セクション: バージョン、支出/在庫/通知件数