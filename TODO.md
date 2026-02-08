# TODO

## 基盤
- [x] Next.js(App Router) + TypeScript 初期化
- [x] Tailwind CSS セットアップ
- [x] npm install（依存取得）
- [x] Tailwind PostCSSプラグイン有効化（@tailwindcss/postcss）
- [x] Prisma + PostgreSQL(Neon) セットアップ
- [x] Auth.js(NextAuth v5) + Google OAuth 実装
- [x] 管理者/許可ドメインの認可ロジック実装

## データモデル
- [x] Prismaスキーマ作成（users/units/projects/project_items(type含む)/holidays/settings…）
- [x] 初期マイグレーション

## 社員向け
- [x] 月次工数表UI（スプレッドシート風）
- [x] 日合計=100到達時のみ保存
- [ ] 休日表示 + 休日出勤フラグ

## 管理者向け
- [x] 社員管理（有効/無効・ユニット割当）
- [x] ユニット管理（プロジェクト割当）
- [x] プロジェクト/開発項目管理（type編集含む）
- [x] プロジェクト作成時のユニット割当UI
- [x] プロジェクト/開発項目のユニット別タブ表示
- [ ] 会社休日管理
- [x] 許可ドメイン管理
- [x] 管理者メール管理

## 出力
- [ ] Google Drive/Sheets 連携
- [ ] 月指定でユニット配下へ一括出力
