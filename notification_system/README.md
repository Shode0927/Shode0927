# 📱 スマホ通知一括管理システム

スマートフォンの全通知をブラウザから一元管理できる Web アプリケーションです。

## 機能

### 通知管理
- **一覧表示** — 全通知をカード形式で表示（新着順・優先度順）
- **既読/未読** — 個別・一括で管理
- **スター** — 重要な通知にスターを付けて後から参照
- **アーカイブ** — 処理済み通知を整理
- **削除** — 不要な通知を削除（個別・一括）
- **検索** — タイトル・本文・アプリ名でリアルタイム検索

### フィルタリング
- すべて / 未読 / スター付き / 緊急 / アーカイブ
- カテゴリ別（メッセージ・メール・SNS・金融・リマインダーなど）
- 優先度別（緊急 🚨 / 高 / 普通 / 低）

### 自動ルール設定
- カテゴリ・優先度・アプリ名を条件に、自動でアーカイブ・スター・既読化

### リアルタイム更新
- WebSocket による即時プッシュ通知

### モバイル対応
- レスポンシブデザイン（スマホ・タブレット・PC）
- PWA 対応（ホーム画面に追加可能）

## セットアップ

```bash
cd notification_system/backend
pip install -r requirements.txt
python app.py
```

ブラウザで `http://localhost:5000` を開きます。

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/notifications` | 通知一覧（ページネーション・フィルタ付き） |
| POST | `/api/notifications` | 通知を作成 |
| GET | `/api/notifications/:id` | 通知詳細 |
| PATCH | `/api/notifications/:id` | 通知を更新（既読・スター等） |
| DELETE | `/api/notifications/:id` | 通知を削除 |
| PATCH | `/api/notifications/bulk` | 一括操作 |
| GET | `/api/stats` | 統計情報 |
| GET/POST | `/api/rules` | 自動ルール管理 |
| DELETE | `/api/rules/:id` | ルール削除 |

## プロジェクト構成

```
notification_system/
├── backend/
│   ├── app.py              # Flask サーバー + WebSocket
│   ├── requirements.txt
│   └── notifications.db    # SQLite（自動生成）
└── frontend/
    ├── templates/
    │   └── index.html      # メイン画面
    └── static/
        ├── css/style.css   # ダークテーマ UI
        ├── js/app.js       # フロントエンドロジック
        └── manifest.json   # PWA マニフェスト
```
