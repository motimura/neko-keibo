# 🐱 猫計簿 (Neko-Keibo)

猫にかかる費用や消耗品の在庫を管理するモバイルアプリ。
iOS / Android 両対応。ローカルファーストで端末内にデータを保存し、オフラインで完全に動作します。

## 機能

- **支出管理** — カテゴリ別に猫関連の支出を記録・集計
- **ダッシュボード** — 月間合計、カテゴリ別円グラフ、前月比
- **在庫管理** — フード・猫砂などの消耗品の残量をステータス管理
- **買い替えリマインダー** — ローカル通知で買い替え時期をお知らせ
- **データエクスポート/インポート** — JSON/CSV でバックアップ・復元

## 技術スタック

- React Native (Expo managed workflow)
- TypeScript
- NativeWind (Tailwind CSS for React Native)
- expo-sqlite (ローカルDB)
- Zustand (状態管理)
- Expo Router (file-based routing)

## セットアップ

```bash
npm install
npx expo start
```

## 開発コマンド

```bash
npx expo start                # 開発サーバー起動
npx expo start --ios          # iOSシミュレーター
npx expo start --android      # Androidエミュレーター
npm run test                  # テスト実行
npm run lint                  # Lint
```

## カテゴリ

| 絵文字 | カテゴリ |
|--------|----------|
| 🍗 | フード |
| 🪣 | 猫砂 |
| 🏥 | 医療 |
| 🧸 | おもちゃ |
| 🛏️ | グッズ |
| ✂️ | トリミング |
| 📦 | その他 |

## ライセンス

Private
