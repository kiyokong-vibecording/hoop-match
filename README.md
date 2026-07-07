# Hoop Match

バスケットボールの**試合相手・メンバー・体育館**を全国47都道府県でまとめて探せる、
登録不要・無料のマッチングアプリです。

公開サイト: https://kiyokong-vibecording.github.io/hoop-match/

## 主な機能

- **募集と応募**: 試合相手 / メンバー / 個人参加 / 助っ人 / 合同練習の募集を作成・検索・応募
- **公開マッチング**: 募集を全国に公開し、アプリ内で応募者とやり取り(返信スレッド)。
  新着応募・新着返信は起動時に自動チェックしてバッジとバナーで通知
- **自動モデレーション**: 安全な投稿は即時公開。U12/U15/U18・個人情報らしき記載・
  スパム疑いのある投稿のみ運営者の承認待ちになる
- **施設検索**: 全47都道府県の体育館・コート・自治体予約システム149件を収録。
  公式予約ページ・地図への直接リンク、施設からの募集作成、非表示(復元可能)
- **安全設計**: U12/U15/U18は成人代表者の確認必須、通報機能、承認制の保険、
  応募の連絡先は募集者のみ閲覧可能
- **ローカルファースト**: 端末内保存が基本。サーバー未設定でも従来どおり動作し、
  JSONバックアップ/復元に対応

## 構成

| パス | 内容 |
|---|---|
| `index.html` / `app.js` / `styles.css` | アプリ本体(依存ライブラリなしのVanilla JS) |
| `data/facilities.json` | 施設カタログの正データ(編集後は `node scripts/build-facilities.js`) |
| `data/config.js` | サーバー接続設定(空ならローカル専用モード) |
| `backend/schema.sql` | Supabase用スキーマ(承認制・管理キー方式・RLS) |
| `tests/` | ブラウザ回帰テスト(`bash tests/run.sh` で全実行) |
| `docs/backend-setup.md` | サーバー構築手順(無料枠・約30分) |
| `docs/launch-checklist.md` | 全国ローンチの手順とチェックリスト |
| `HANDOFF.md` | 開発の経緯と設計判断の引き継ぎ資料 |

## 開発

```bash
# ローカルで起動
python3 -m http.server 4173
# → http://localhost:4173 を開く

# 施設データを編集したら
node scripts/build-facilities.js

# コード変更後はコミット前に必ず
bash tests/run.sh
```

## 運用メモ

- 投稿の承認・通報対応: Supabase Table Editor(`docs/backend-setup.md` の運用表を参照)
- 利用規約(`terms.html`)・プライバシーポリシー(`privacy.html`)はドラフト。
  本格運用前に連絡先の記入と専門家レビューを行うこと
