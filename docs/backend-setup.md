# 公開マッチング(サーバー連携)セットアップ手順

Hoop Matchの「公開募集」機能を有効にする手順です。所要時間は15〜30分、
**月額費用は0円**(Supabase無料枠)で運用できます。

設定しない場合、アプリは従来どおり端末内保存のみで動作します(公開機能は無効のまま)。

## 仕組みの概要

- 公開募集はSupabase(無料のホスティング付きデータベース)に保存されます
- 投稿は**承認制**: 投稿直後は「承認待ち」で、管理者(あなた)がSupabaseの
  管理画面で承認して初めて全ユーザーに公開されます
- 投稿者には**管理キー**が発行され、端末に保存されます。応募の閲覧と募集終了は
  管理キーを持つ本人だけが行えます(サーバーにはキーのハッシュのみ保存)
- 応募に書かれた連絡先は**募集者以外は閲覧できません**

## 手順

### 1. Supabaseプロジェクトを作る

1. https://supabase.com/ でアカウント作成(無料)
2. 「New project」でプロジェクト作成
   - Name: `hoop-match` など
   - Database Password: 強いパスワードを設定して控える
   - Region: `Northeast Asia (Tokyo)` を推奨
3. 作成完了まで1〜2分待つ

### 2. データベーススキーマを適用する

1. 左メニューの「SQL Editor」を開く
2. このリポジトリの `backend/schema.sql` の**全文**をコピーして貼り付け
3. 「Run」を実行。「Success. No rows returned」と出ればOK

### 3. 接続情報をアプリに設定する

1. Supabase左メニュー「Project Settings」→「API」を開く
2. 以下の2つをコピー:
   - **Project URL** (例: `https://xxxx.supabase.co`)
   - **anon public** キー(**service_role キーではない**ことを必ず確認)
3. リポジトリの `data/config.js` を編集:

```js
window.HOOP_CONFIG = {
  supabaseUrl: "https://xxxx.supabase.co",
  supabaseAnonKey: "eyJhbGciOi...(anon publicキー)",
};
```

4. アプリを再読み込みすると、募集作成フォームに「公開範囲」が現れ、
   募集一覧に「公開募集を読み込む」が有効になります

anon キーはWebページに埋め込む前提の公開可能なキーです(データ保護は
サーバー側の行レベルセキュリティで行われます)。**service_role キーは
絶対にconfig.jsやリポジトリに書かないでください。**

### 4. 公開する(GitHub Pages)

リポジトリをGitHubにpush後、リポジトリの Settings → Pages →
Branch: `main` / `(root)` で公開できます。数分後に
`https://<ユーザー名>.github.io/<リポジトリ名>/` でアクセス可能になります。

公開前に、リポジトリ直下の `terms.html`(利用規約)と `privacy.html`
(プライバシーポリシー)の連絡先欄を自分の連絡先に書き換えてください。
**これらはドラフトです。本格公開の前に専門家のレビューを受けてください**
(docs/legal-checklist.md参照)。

## 日々の運用(管理者)

Supabase左メニュー「Table Editor」で行います。

| やること | 操作 |
|---|---|
| 投稿の承認 | `public_listings` で該当行の `status` を `pending` → `approved` |
| 投稿の却下 | `status` を `rejected` に(公開されません) |
| 通報の確認 | `reports` テーブルを確認 → 問題があれば該当募集を `closed`/`rejected` |
| 削除依頼対応 | `public_listings` の該当行を削除(応募も自動で消えます) |

### 自動モデレーション(2026-07-05から)

一般カテゴリの安全な投稿は**即時公開**されます。次に該当する投稿だけが
承認待ち(pending)になり、あなたの確認を待ちます:
- U12/U15/U18カテゴリ(子ども関連はすべて事前確認・自動公開しない)
- 電話番号・メールアドレス・URL・LINE ID交換らしき記載を含む
- 出会い目的・副業/投資勧誘などのスパム疑い語を含む

即時公開された投稿も、通報や巡回で問題を見つけたら status を
closed/rejected に変更して非公開にできます(事後対応)。

承認の目安(チェックポイント):
- 個人情報(氏名・電話番号・住所・学校名・SNSの個人アカウント等)が本文にない
- U12/U15/U18は内容が成人代表者による投稿として妥当
- 営利スパム・出会い目的・差別的内容でない

## 制限と注意

- Supabase無料枠: DB 500MB・帯域5GB/月・APIリクエスト無制限(公平利用の範囲)。
  小規模運用には十分ですが、**1週間アクセスがないとプロジェクトが一時停止**される
  ことがあります(管理画面から再開可能)
- 迷惑投稿対策は「承認制」が主です。投稿が増えてきたら、Supabaseの
  Edge FunctionsやCloudflare Turnstileの導入を検討してください
- 応募にはメールアドレス等の連絡先が含まれます。プライバシーポリシーの
  記載(保存先・閲覧範囲・削除依頼窓口)を必ず実態に合わせてください


## アプリ内やり取り(返信スレッド)について(2026-07-05から)

- 応募時に応募者へ「応募キー」が発行され、端末に保存されます
- 募集者は「応募を確認」から、応募者は「やり取りを確認」から、アプリ内で往復の返信ができます
- やり取りは当事者(募集の管理キー/応募キーの保持者)のみ閲覧可能。第三者・匿名アクセスからは見えません
- アプリを開いたとき・公開募集を読み込んだときに新着応募/新着返信を自動チェックし、赤いバッジで通知します
- 返信は1つの応募につき最大200件(スパム対策)

## トラブルシューティング

### 「function gen_random_bytes(integer) does not exist」と出る
Supabaseでは暗号化関数(pgcrypto)が `extensions` スキーマに置かれるため、
SECURITY DEFINER関数から見えないことがあります。schema.sqlは次の対策済みです:
- `create extension ... with schema extensions`
- 関数に `set search_path = public, extensions`
- 呼び出しを `extensions.gen_random_bytes(...)` / `extensions.digest(...)` と明示
古いスキーマで作成済みの場合は、schema.sqlの関数定義部分(submit_listing /
get_my_listing_detail / close_listing)を再実行すれば上書きされて直ります。

### 「Invalid path specified in request URL」と出る
data/config.js の supabaseUrl は `https://xxxx.supabase.co` まで(末尾スラッシュや
`/rest/v1/` を付けない)。アプリ側が自動でパスを付与します。
